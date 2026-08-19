from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class CharacterBase(BaseModel):
    name: str = Field(..., max_length=100, description="Character display name")
    tagline: str | None = Field(None, max_length=255, description="Short roleplay subtitle")
    description: str | None = Field(None, description="Full character description / lore")
    personality: str | None = Field(None, description="Personality traits & speech directives")
    scenario: str | None = Field(None, description="Current roleplay setting & environment")
    first_mes: str = Field(..., description="First greeting message")
    mes_example: str | None = Field(None, description="Example dialogues")
    avatar_url: str | None = Field(None, max_length=500, description="Image URL or local asset path")
    tags: list[str] = Field(default_factory=list, description="Genre tags (Fantasy, Cyberpunk, etc.)")
    is_favorite: bool = Field(default=False)
    creator: str = Field(default="Renoog Team")

class CharacterCreate(CharacterBase):
    id: str | None = None

class CharacterUpdate(BaseModel):
    name: str | None = None
    tagline: str | None = None
    description: str | None = None
    personality: str | None = None
    scenario: str | None = None
    first_mes: str | None = None
    mes_example: str | None = None
    avatar_url: str | None = None
    tags: list[str] | None = None
    is_favorite: bool | None = None

class CharacterRead(CharacterBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
