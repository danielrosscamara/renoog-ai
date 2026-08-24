from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class MessageTurnBase(BaseModel):
    role: str = Field(..., description="'user' | 'assistant' | 'system'")
    active_index: int = Field(default=0, ge=0)
    swipes: list[str] = Field(default_factory=list, description="Candidate response variations")
    model_name: str | None = Field(None, description="LLM model that authored this turn")

class MessageTurnCreate(MessageTurnBase):
    id: str | None = None
    chat_id: str

class MessageTurnUpdate(BaseModel):
    active_index: int | None = None
    swipes: list[str] | None = None

class MessageTurnRead(MessageTurnBase):
    id: str
    chat_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ChatBase(BaseModel):
    character_id: str
    persona_id: str | None = None
    title: str = Field(..., max_length=255)
    model_name: str = Field(default="anthropic/claude-3.5-sonnet")
    temperature: float = Field(default=0.90, ge=0.0, le=2.0)
    is_pinned: bool = Field(default=False)

class ChatCreate(BaseModel):
    character_id: str
    persona_id: str | None = None
    title: str | None = None
    model_name: str = "anthropic/claude-3.5-sonnet"
    temperature: float = 0.90

class ChatUpdate(BaseModel):
    title: str | None = None
    persona_id: str | None = None
    model_name: str | None = None
    temperature: float | None = None
    is_pinned: bool | None = None

class ChatRead(ChatBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ChatReadWithTurns(ChatRead):
    turns: list[MessageTurnRead] = Field(default_factory=list)
