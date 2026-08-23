import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    Float,
    Integer,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def utcnow():
    return datetime.now(timezone.utc)

def generate_uuid():
    return str(uuid.uuid4())

class CharacterModel(Base):
    __tablename__ = "characters"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False, index=True)
    tagline = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    personality = Column(Text, nullable=True)
    scenario = Column(Text, nullable=True)
    first_mes = Column(Text, nullable=False)
    mes_example = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)
    tags = Column(JSON, default=list)
    is_favorite = Column(Boolean, default=False)
    creator = Column(String(100), default="Renoog Team")
    created_at = Column(DateTime, default=utcnow)

    chats = relationship(
        "ChatModel",
        back_populates="character",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

class PersonaModel(Base):
    __tablename__ = "personas"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    chats = relationship("ChatModel", back_populates="persona")

class ChatModel(Base):
    __tablename__ = "chats"

    id = Column(String, primary_key=True, default=generate_uuid)
    character_id = Column(
        String, ForeignKey("characters.id", ondelete="CASCADE"), nullable=False
    )
    persona_id = Column(
        String, ForeignKey("personas.id", ondelete="SET NULL"), nullable=True
    )
    title = Column(String(255), nullable=False)
    model_name = Column(String(100), default="anthropic/claude-3.5-sonnet")
    temperature = Column(Float, default=0.90)
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    character = relationship("CharacterModel", back_populates="chats")
    persona = relationship("PersonaModel", back_populates="chats")
    turns = relationship(
        "MessageTurnModel",
        back_populates="chat",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="MessageTurnModel.created_at",
    )

class MessageTurnModel(Base):
    __tablename__ = "message_turns"

    id = Column(String, primary_key=True, default=generate_uuid)
    chat_id = Column(
        String, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role = Column(String(20), nullable=False)  # 'user' | 'assistant' | 'system'
    active_index = Column(Integer, default=0)
    swipes = Column(JSON, default=list)  # Array of alternative text responses
    created_at = Column(DateTime, default=utcnow)

    chat = relationship("ChatModel", back_populates="turns")
