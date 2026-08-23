import json
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

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            async with client.stream("POST", openrouter_url, headers=headers, json=body) as response:
                if response.status_code != 200:
                    err_body = await response.aread()
                    yield json.dumps({"event": "error", "error": f"OpenRouter HTTP {response.status_code}: {err_body.decode('utf-8', errors='ignore')}"})
                    return

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
                                full_response_text += delta
                                yield json.dumps({"event": "token", "token": delta})
                        except Exception:
                            continue

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

            yield json.dumps({
                "event": "done",
                "turn_id": str(assistant_turn.id),
                "full_text": full_response_text.strip()
            })

    except Exception as e:
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
    if not api_key or api_key.startswith("sk-or-v1-xxx"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OpenRouter API Key not provided. Please add your key in Settings or headers."
        )

    # 1. Fetch Chat & Character
    stmt = select(ChatModel).options(selectinload(ChatModel.turns)).where(ChatModel.id == req.chat_id)
    chat = (await db.execute(stmt)).scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Chat '{req.chat_id}' not found.")

    char_id = getattr(chat, "character_id", None)
    char_stmt = select(CharacterModel).where(CharacterModel.id == str(char_id))
    character = (await db.execute(char_stmt)).scalar_one_or_none()
    if not character:
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

    return EventSourceResponse(
        stream_openrouter_generator(
            chat_id=req.chat_id,
            payload_messages=compiled_messages,
            model_name=str(target_model),
            temperature=target_temp,
            api_key=api_key
        )
    )
