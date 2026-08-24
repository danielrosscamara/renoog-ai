import json
import logging
from collections.abc import AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sse_starlette.sse import EventSourceResponse
import httpx
from app.core.config import settings
from app.core.prompt_compiler import compile_prompt_payload
from app.db.models import CharacterModel, ChatModel, MessageTurnModel, PersonaModel
from app.db.session import AsyncSessionLocal, get_db

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/chat", tags=["Streaming"])

class StreamChatRequest(BaseModel):
    chat_id: str = Field(..., description="Active chat session ID")
    user_message: str = Field(..., description="User roleplay message input")
    model_name: str | None = Field(None, description="Optional LLM slug override")
    temperature: float | None = Field(None, ge=0.0, le=2.0)

async def stream_openrouter_generator(
    chat_id: str,
    payload_messages: list[dict],
    model_name: str,
    temperature: float,
    api_key: str
) -> AsyncGenerator[str, None]:
    """Connects to OpenRouter API and streams tokens as Server-Sent Events."""
    full_response_text = ""

    openrouter_url = f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Renoog AI Roleplay Engine",
        "Content-Type": "application/json",
    }
    body = {
        "model": model_name,
        "messages": payload_messages,
        "temperature": temperature,
        "stream": True,
    }

    masked_key = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "***"
    logger.info(f"[STREAM] 🚀 Connecting to OpenRouter URL={openrouter_url} | Model='{model_name}' | Key={masked_key}")

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            async with client.stream("POST", openrouter_url, headers=headers, json=body) as response:
                if response.status_code != 200:
                    err_body = (await response.aread()).decode("utf-8", errors="ignore")
                    logger.error(f"[STREAM] ❌ OpenRouter HTTP {response.status_code} Error: {err_body}")
                    yield json.dumps({
                        "event": "error",
                        "error": f"OpenRouter HTTP {response.status_code}: {err_body}"
                    })
                    return

                logger.info(f"[STREAM] 🟢 OpenRouter 200 OK. Streaming tokens for chat '{chat_id}'...")
                token_count = 0

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        raw_data = line[6:].strip()
                        if raw_data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(raw_data)
                            delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if delta:
                                token_count += 1
                                full_response_text += delta
                                yield json.dumps({"event": "token", "token": delta})
                        except Exception:
                            continue

                logger.info(f"[STREAM] ✅ Finished stream. Generated {token_count} tokens (~{len(full_response_text)} chars).")

        # Save generated assistant response into database
        async with AsyncSessionLocal() as session:
            assistant_turn = MessageTurnModel(
                chat_id=chat_id,
                role="assistant",
                active_index=0,
                swipes=[full_response_text.strip()],
            )
            session.add(assistant_turn)
            await session.commit()
            await session.refresh(assistant_turn)

            logger.info(f"[STREAM] 💾 Saved assistant turn '{assistant_turn.id}' to database.")
            yield json.dumps({
                "event": "done",
                "turn_id": str(assistant_turn.id),
                "full_text": full_response_text.strip()
            })

    except Exception as e:
        logger.error(f"[STREAM] 💥 Exception during streaming: {str(e)}", exc_info=True)
        yield json.dumps({"event": "error", "error": str(e)})

@router.post("/stream")
async def stream_chat_response(
    req: StreamChatRequest,
    x_openrouter_key: str | None = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """Initiates an SSE token stream for roleplay conversation turns."""
    # Resolve OpenRouter API Key
    api_key = x_openrouter_key or getattr(settings, "OPENROUTER_API_KEY", None)

    logger.info(f"[STREAM] 📨 Incoming stream request for chat_id='{req.chat_id}', message='{req.user_message[:30]}...'")

    if not api_key or api_key.startswith("sk-or-v1-xxx"):
        logger.error("[STREAM] ❌ Rejected: OpenRouter API Key not provided or placeholder!")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OpenRouter API Key not provided. Please paste your key in Settings (⚙️) or headers."
        )

    # 1. Fetch Chat & Character
    stmt = select(ChatModel).options(selectinload(ChatModel.turns)).where(ChatModel.id == req.chat_id)
    chat = (await db.execute(stmt)).scalar_one_or_none()
    if not chat:
        logger.error(f"[STREAM] ❌ Chat '{req.chat_id}' not found in database.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Chat '{req.chat_id}' not found.")

    char_id = getattr(chat, "character_id", None)
    char_stmt = select(CharacterModel).where(CharacterModel.id == str(char_id))
    character = (await db.execute(char_stmt)).scalar_one_or_none()
    if not character:
        logger.error(f"[STREAM] ❌ Character '{char_id}' not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found.")

    persona = None
    pers_id = getattr(chat, "persona_id", None)
    if pers_id:
        p_stmt = select(PersonaModel).where(PersonaModel.id == str(pers_id))
        persona = (await db.execute(p_stmt)).scalar_one_or_none()

    # 2. Persist User Message Turn in SQLite
    user_turn = MessageTurnModel(
        chat_id=req.chat_id,
        role="user",
        active_index=0,
        swipes=[req.user_message.strip()],
    )
    db.add(user_turn)
    await db.commit()

    # 3. Compile 6-Layer Messages Payload
    raw_turns = getattr(chat, "turns", None) or []
    existing_turns: list[MessageTurnModel] = [*raw_turns, user_turn]
    compiled_messages = compile_prompt_payload(character, persona, existing_turns)

    target_model = req.model_name or getattr(chat, "model_name", None) or settings.DEFAULT_MODEL
    target_temp = req.temperature if req.temperature is not None else float(getattr(chat, "temperature", 0.90))

    logger.info(f"[STREAM] 🧩 Prompt compiled with {len(compiled_messages)} messages | Target Model='{target_model}' | Temp={target_temp}")

    return EventSourceResponse(
        stream_openrouter_generator(
            chat_id=req.chat_id,
            payload_messages=compiled_messages,
            model_name=str(target_model),
            temperature=target_temp,
            api_key=api_key
        )
    )
