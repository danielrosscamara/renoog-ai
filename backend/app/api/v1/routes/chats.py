from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.db.models import ChatModel, CharacterModel, MessageTurnModel
from app.schemas.chat import (
    ChatCreate,
    ChatRead,
    ChatReadWithTurns,
    ChatUpdate,
    MessageTurnRead,
    MessageTurnUpdate,
)

router = APIRouter(prefix="/chats", tags=["Chats"])

@router.get("", response_model=list[ChatRead])
async def get_chats(db: AsyncSession = Depends(get_db)):
    """Fetch all chat sessions ordered by pinned status and last updated timestamp."""
    stmt = select(ChatModel).order_by(ChatModel.is_pinned.desc(), ChatModel.updated_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{chat_id}", response_model=ChatReadWithTurns)
async def get_chat_by_id(chat_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch a chat session with all its message turns and candidate swipes."""
    stmt = select(ChatModel).options(selectinload(ChatModel.turns)).where(ChatModel.id == chat_id)
    chat = (await db.execute(stmt)).scalar_one_or_none()
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{chat_id}' not found."
        )
    return chat

@router.post("", response_model=ChatReadWithTurns, status_code=status.HTTP_201_CREATED)
async def create_chat(data: ChatCreate, db: AsyncSession = Depends(get_db)):
    """Create a new chat session and initialize with character's opening greeting."""
    stmt = select(CharacterModel).where(CharacterModel.id == data.character_id)
    character = (await db.execute(stmt)).scalar_one_or_none()
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Character '{data.character_id}' not found."
        )

    title = data.title or f"Chat with {character.name}"
    chat = ChatModel(
        character_id=data.character_id,
        persona_id=data.persona_id,
        title=title,
        model_name=data.model_name,
        temperature=data.temperature,
    )
    db.add(chat)
    await db.flush()

    # Automatically add Turn 1 (Assistant First Greeting)
    if character.first_mes:
        first_turn = MessageTurnModel(
            chat_id=chat.id,
            role="assistant",
            active_index=0,
            swipes=[character.first_mes]
        )
        db.add(first_turn)

    await db.commit()
    return await get_chat_by_id(str(chat.id), db)

@router.put("/{chat_id}", response_model=ChatRead)
async def update_chat(chat_id: str, data: ChatUpdate, db: AsyncSession = Depends(get_db)):
    """Update chat title, pinned status, model, or active persona."""
    stmt = select(ChatModel).where(ChatModel.id == chat_id)
    chat = (await db.execute(stmt)).scalar_one_or_none()
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{chat_id}' not found."
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(chat, field, value)

    await db.commit()
    await db.refresh(chat)
    return chat

@router.put("/{chat_id}/turns/{turn_id}/swipe", response_model=MessageTurnRead)
async def update_turn_swipe(
    chat_id: str,
    turn_id: str,
    data: MessageTurnUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Switch active swipe index for candidate response browsing."""
    stmt = select(MessageTurnModel).where(
        MessageTurnModel.id == turn_id,
        MessageTurnModel.chat_id == chat_id
    )
    turn = (await db.execute(stmt)).scalar_one_or_none()
    if not turn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message turn '{turn_id}' not found in chat '{chat_id}'."
        )

    if data.active_index is not None:
        setattr(turn, "active_index", data.active_index)
    if data.swipes is not None:
        setattr(turn, "swipes", data.swipes)

    await db.commit()
    await db.refresh(turn)
@router.put("/{chat_id}/turns/{turn_id}", response_model=MessageTurnRead)
async def update_turn(
    chat_id: str,
    turn_id: str,
    data: MessageTurnUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Edit message content, active swipe index, or pin status."""
    stmt = select(MessageTurnModel).where(
        MessageTurnModel.id == turn_id,
        MessageTurnModel.chat_id == chat_id
    )
    turn = (await db.execute(stmt)).scalar_one_or_none()
    if not turn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message turn '{turn_id}' not found in chat '{chat_id}'."
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(turn, field, value)

    await db.commit()
    await db.refresh(turn)
    return turn

@router.delete("/{chat_id}/turns/{turn_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_turn(
    chat_id: str,
    turn_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a single message turn from a chat."""
    stmt = select(MessageTurnModel).where(
        MessageTurnModel.id == turn_id,
        MessageTurnModel.chat_id == chat_id
    )
    turn = (await db.execute(stmt)).scalar_one_or_none()
    if not turn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message turn '{turn_id}' not found in chat '{chat_id}'."
        )

    await db.delete(turn)
    await db.commit()

@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(chat_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a chat session and all its message turns."""
    stmt = select(ChatModel).where(ChatModel.id == chat_id)
    chat = (await db.execute(stmt)).scalar_one_or_none()
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{chat_id}' not found."
        )
    await db.delete(chat)
    await db.commit()
