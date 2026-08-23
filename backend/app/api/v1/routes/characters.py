from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import CharacterModel
from app.schemas.character import CharacterCreate, CharacterRead

router = APIRouter(prefix="/characters", tags=["Characters"])

@router.get("", response_model=list[CharacterRead])
async def get_characters(
    tag: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """Fetch all character cards with optional genre tag and search query filters."""
    stmt = select(CharacterModel).order_by(CharacterModel.is_favorite.desc(), CharacterModel.created_at.desc())
    result = await db.execute(stmt)
    characters = result.scalars().all()

    filtered = list(characters)
    if tag and tag.lower() != "all":
        filtered = [c for c in filtered if tag.lower() in [t.lower() for t in (c.tags or [])]]
    if search:
        s = search.lower()
        filtered = [
            c for c in filtered
            if s in c.name.lower()
            or (c.tagline and s in c.tagline.lower())
            or (c.description and s in c.description.lower())
        ]
    return filtered

@router.get("/{character_id}", response_model=CharacterRead)
async def get_character_by_id(character_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch a single character card by its unique ID."""
    stmt = select(CharacterModel).where(CharacterModel.id == character_id)
    character = (await db.execute(stmt)).scalar_one_or_none()
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Character with ID '{character_id}' not found."
        )
    return character

@router.post("", response_model=CharacterRead, status_code=status.HTTP_201_CREATED)
async def create_character(data: CharacterCreate, db: AsyncSession = Depends(get_db)):
    """Create a new character card in SQLite."""
    character = CharacterModel(**data.model_dump(exclude_unset=True))
    db.add(character)
    await db.commit()
    await db.refresh(character)
    return character

@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(character_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a character card by ID."""
    stmt = select(CharacterModel).where(CharacterModel.id == character_id)
    character = (await db.execute(stmt)).scalar_one_or_none()
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Character with ID '{character_id}' not found."
        )
    await db.delete(character)
    await db.commit()
