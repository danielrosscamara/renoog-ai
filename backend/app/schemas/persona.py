from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class PersonaBase(BaseModel):
    name: str = Field(..., max_length=100, description="User persona name")
    description: str | None = Field(None, description="User backstory, appearance, and personality")
    avatar_url: str | None = Field(None, description="Avatar image URL or Base64 Data URI")
    is_default: bool = Field(default=False, description="Default active persona flag")

class PersonaCreate(PersonaBase):
    id: str | None = None

class PersonaUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    avatar_url: str | None = None
    is_default: bool | None = None

class PersonaRead(PersonaBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
