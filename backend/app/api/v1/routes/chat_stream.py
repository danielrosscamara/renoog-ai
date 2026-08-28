import json
import logging
import time
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
    provider: str | None = Field("openrouter", description="Inference provider: openrouter, ollama, custom")
    endpoint_url: str | None = Field(None, description="Optional custom endpoint URL for local Ollama/LM Studio")
    temperature: float | None = Field(None, ge=0.0, le=2.0)
    top_p: float | None = Field(None, ge=0.0, le=1.0)
    frequency_penalty: float | None = Field(None, ge=-2.0, le=2.0)
    presence_penalty: float | None = Field(None, ge=-2.0, le=2.0)
    repetition_penalty: float | None = Field(None, ge=0.0, le=2.0)
    max_tokens: int | None = Field(None, ge=1, le=8192)
    stop: list[str] | None = Field(None, description="Stop sequences to halt generation")
    auxiliary_prompt: str | None = Field(None, description="Optional custom Auxiliary / NSFW / Narrative Focus directive")

async def stream_chat_completion_generator(
    chat_id: str,
    payload_messages: list[dict],
    model_name: str,
    temperature: float,
    provider: str = "openrouter",
    api_key: str | None = None,
    endpoint_url: str | None = None,
    top_p: float | None = None,
    frequency_penalty: float | None = None,
    presence_penalty: float | None = None,
    repetition_penalty: float | None = None,
    max_tokens: int | None = None,
    stop: list[str] | None = None,
) -> AsyncGenerator[str, None]:
    """Connects to OpenRouter or Local Ollama/Custom API and streams tokens as Server-Sent Events."""
    full_response_text = ""
    full_thought_text = ""
    is_thinking_block = False
    start_time = time.time()
    first_token_time: float | None = None

    # 1. Resolve Target URL and Headers based on Provider
    if provider == "ollama":
        base = (endpoint_url or "http://localhost:11434").rstrip("/")
        if not base.endswith("/v1") and not base.endswith("/chat/completions"):
            target_url = f"{base}/v1/chat/completions"
        elif base.endswith("/v1"):
            target_url = f"{base}/chat/completions"
        else:
            target_url = base

        headers = {
            "Content-Type": "application/json",
        }
        logger.info(f"[STREAM] 🦙 Connecting to Local Ollama URL={target_url} | Model='{model_name}'")

    elif provider == "custom":
        base = (endpoint_url or "http://localhost:1234/v1").rstrip("/")
        target_url = f"{base}/chat/completions" if not base.endswith("/chat/completions") else base
        headers = {
            "Content-Type": "application/json",
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        logger.info(f"[STREAM] ⚡ Connecting to Custom Local Endpoint URL={target_url} | Model='{model_name}'")

    else:
        # Default: OpenRouter
        target_url = f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key or ''}",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "Renoog AI Roleplay Engine",
            "Content-Type": "application/json",
        }
        masked_key = f"{api_key[:8]}...{api_key[-4:]}" if api_key and len(api_key) > 12 else "***"
        logger.info(f"[STREAM] 🌐 Connecting to OpenRouter URL={target_url} | Model='{model_name}' | Key={masked_key}")

    body: dict = {
        "model": model_name,
        "messages": payload_messages,
        "temperature": temperature,
        "stream": True,
    }
    if top_p is not None:
        body["top_p"] = top_p
    if frequency_penalty is not None and frequency_penalty != 0:
        body["frequency_penalty"] = frequency_penalty
    if presence_penalty is not None and presence_penalty != 0:
        body["presence_penalty"] = presence_penalty
    if repetition_penalty is not None and repetition_penalty != 1.0:
        body["repetition_penalty"] = repetition_penalty
    if max_tokens is not None and max_tokens > 0:
        body["max_tokens"] = max_tokens
    if stop:
        body["stop"] = stop

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", target_url, headers=headers, json=body) as response:
                if response.status_code != 200:
                    err_body = (await response.aread()).decode("utf-8", errors="ignore")
                    logger.error(f"[STREAM] ❌ Provider HTTP {response.status_code} Error: {err_body}")
                    yield json.dumps({
                        "event": "error",
                        "error": f"Provider HTTP {response.status_code}: {err_body}"
                    })
                    return

                logger.info(f"[STREAM] 🟢 {provider.upper()} 200 OK. Streaming tokens for chat '{chat_id}'...")
                token_count = 0
                prompt_tokens = 0
                completion_tokens = 0
                total_tokens = 0

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        raw_data = line[6:].strip()
                        if raw_data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(raw_data)
                            delta_obj = chunk.get("choices", [{}])[0].get("delta", {}) or {}

                            # 1. Capture reasoning/thought fields (DeepSeek-R1 / OpenRouter format)
                            reasoning_delta = (
                                delta_obj.get("reasoning_content")
                                or delta_obj.get("reasoning")
                                or delta_obj.get("thought")
                                or ""
                            )
                            if reasoning_delta:
                                if first_token_time is None:
                                    first_token_time = time.time()
                                full_thought_text += reasoning_delta
                                yield json.dumps({"event": "thought", "thought": reasoning_delta})

                            # 2. Capture standard content tokens
                            content_delta = delta_obj.get("content", "")
                            if content_delta:
                                if first_token_time is None:
                                    first_token_time = time.time()

                                # Handle inline <think> tags (Ollama reasoning models)
                                if "<think>" in content_delta:
                                    is_thinking_block = True
                                    parts = content_delta.split("<think>", 1)
                                    if parts[0]:
                                        token_count += 1
                                        full_response_text += parts[0]
                                        yield json.dumps({"event": "token", "token": parts[0]})
                                    content_delta = parts[1]

                                if is_thinking_block:
                                    if "</think>" in content_delta:
                                        is_thinking_block = False
                                        think_parts = content_delta.split("</think>", 1)
                                        full_thought_text += think_parts[0]
                                        yield json.dumps({"event": "thought", "thought": think_parts[0]})
                                        if think_parts[1]:
                                            token_count += 1
                                            full_response_text += think_parts[1]
                                            yield json.dumps({"event": "token", "token": think_parts[1]})
                                    else:
                                        full_thought_text += content_delta
                                        yield json.dumps({"event": "thought", "thought": content_delta})
                                else:
                                    token_count += 1
                                    full_response_text += content_delta
                                    yield json.dumps({"event": "token", "token": content_delta})

                            # Capture server-calculated usage statistics if provided
                            usage = chunk.get("usage")
                            if usage:
                                prompt_tokens = usage.get("prompt_tokens", 0)
                                completion_tokens = usage.get("completion_tokens", 0)
                                total_tokens = usage.get("total_tokens", 0)
                        except Exception:
                            continue

                logger.info(f"[STREAM] ✅ Finished stream. Generated {token_count} tokens (~{len(full_response_text)} chars). Usage: prompt={prompt_tokens}, completion={completion_tokens}, total={total_tokens}")

        # Save generated assistant response into database
        async with AsyncSessionLocal() as session:
            assistant_turn = MessageTurnModel(
                chat_id=chat_id,
                role="assistant",
                active_index=0,
                swipes=[full_response_text.strip()],
                model_name=model_name,
            )
            session.add(assistant_turn)
            await session.commit()
            await session.refresh(assistant_turn)

            total_duration = max(0.001, time.time() - start_time)
            latency_ms = round((first_token_time - start_time) * 1000) if first_token_time else round(total_duration * 1000)
            tok_per_sec = round(token_count / total_duration, 1)

            logger.info(f"[STREAM] 💾 Saved assistant turn '{assistant_turn.id}'. Latency: {latency_ms}ms | Speed: {tok_per_sec} tok/s | Thought length: {len(full_thought_text)} chars.")
            yield json.dumps({
                "event": "done",
                "turn_id": str(assistant_turn.id),
                "full_text": full_response_text.strip(),
                "thought": full_thought_text.strip(),
                "speed_tok_s": tok_per_sec,
                "latency_ms": latency_ms,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens or (prompt_tokens + completion_tokens),
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
    provider = req.provider or "openrouter"
    api_key = x_openrouter_key or getattr(settings, "OPENROUTER_API_KEY", None)

    logger.info(f"[STREAM] 📨 Incoming stream request for chat_id='{req.chat_id}', provider='{provider}', message='{req.user_message[:30]}...'")

    # Only enforce API key if provider is OpenRouter
    if provider == "openrouter":
        if not api_key or api_key.startswith("sk-or-v1-xxx"):
            logger.error("[STREAM] ❌ Rejected: OpenRouter API Key not provided or placeholder!")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="OpenRouter API Key not provided. Please paste your key in Settings (⚙️) or switch to Local Ollama."
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

    # Model context window resolution map (SillyTavern power-user context presets)
    MODEL_CONTEXT_MAP = {
        "dolphin-phi": 4096,
        "phi": 4096,
        "gemma": 8192,
        "llama3": 8192,
        "qwen": 32768,
        "mistral": 32768,
        "hermes": 32768,
        "claude": 200000,
    }

    target_model = str(req.model_name or getattr(chat, "model_name", None) or (
        "qwen2.5-coder:1.5b" if provider == "ollama" else settings.DEFAULT_MODEL
    ))

    # Resolve context limit for active model
    max_ctx = 8192
    for model_key, ctx_val in MODEL_CONTEXT_MAP.items():
        if model_key in target_model.lower():
            max_ctx = ctx_val
            break

    # Build dynamic stop sequences (SillyTavern instruct-mode.js:stop_sequence port)
    char_name = str(getattr(character, "name", "Character"))
    user_name = str(getattr(persona, "name", "User")) if persona else "User"
    auto_stop = [
        f"\n{user_name}:",
        f"\n{char_name}:",
        "\nUser:",
        "\n{{user}}:",
        f"\n<{user_name}>",
        f"\n<{char_name}>",
    ]
    combined_stop = list(set((req.stop or []) + auto_stop))

    # 3. Compile 6-Layer Messages Payload with Model Context Window & Position 8 Auxiliary Prompt
    raw_turns = getattr(chat, "turns", None) or []
    existing_turns: list[MessageTurnModel] = [*raw_turns, user_turn]
    compiled_messages = compile_prompt_payload(
        character=character,
        persona=persona,
        turns=existing_turns,
        max_context=max_ctx,
        auxiliary_prompt=req.auxiliary_prompt,
    )

    target_temp = req.temperature if req.temperature is not None else float(getattr(chat, "temperature", 0.90))

    logger.info(
        f"[STREAM] 🧩 Prompt compiled with {len(compiled_messages)} messages | MaxContext={max_ctx} | Provider='{provider}' | Target Model='{target_model}' | Temp={target_temp} | RepPenalty={req.repetition_penalty} | MaxTokens={req.max_tokens}"
    )

    return EventSourceResponse(
        stream_chat_completion_generator(
            chat_id=req.chat_id,
            payload_messages=compiled_messages,
            model_name=target_model,
            temperature=target_temp,
            provider=provider,
            api_key=api_key,
            endpoint_url=req.endpoint_url,
            top_p=req.top_p,
            frequency_penalty=req.frequency_penalty,
            presence_penalty=req.presence_penalty,
            repetition_penalty=req.repetition_penalty,
            max_tokens=req.max_tokens,
            stop=combined_stop,
        )
    )

