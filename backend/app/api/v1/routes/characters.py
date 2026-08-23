import base64
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.png_parser import embed_tavern_card_in_png, extract_tavern_card_from_png
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
    """Fetch all characters with optional tag and search filters."""
    stmt = select(CharacterModel).order_by(CharacterModel.is_favorite.desc(), CharacterModel.created_at.desc())
    result = await db.execute(stmt)
    characters = result.scalars().all()

    filtered = list(characters)
    if tag:
        tag_lower = tag.lower()
        filtered = [c for c in filtered if getattr(c, "tags", None) and any(tag_lower == t.lower() for t in getattr(c, "tags", []))]

    if search:
        search_lower = search.lower()
        filtered = [
            c for c in filtered
            if search_lower in str(getattr(c, "name", "")).lower() or (getattr(c, "tagline", None) and search_lower in str(getattr(c, "tagline", "")).lower())
        ]

    return filtered

@router.get("/{character_id}", response_model=CharacterRead)
async def get_character_by_id(character_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch a single character card by ID."""
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
    """Create a new character card."""
    character = CharacterModel(**data.model_dump(exclude_unset=True))
    db.add(character)
    await db.commit()
    await db.refresh(character)
    return character

@router.post("/import-png", response_model=CharacterRead, status_code=status.HTTP_201_CREATED)
async def import_character_from_png(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload and parse a TavernAI V2 / V1 character card PNG."""
    if not file.filename or not file.filename.lower().endswith(".png"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a .png image."
        )

    file_bytes = await file.read()
    try:
        parsed_card = extract_tavern_card_from_png(file_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid character card PNG: {str(e)}"
        )

    # Convert uploaded PNG image to Base64 Data URI for avatar
    b64_avatar = f"data:image/png;base64,{base64.b64encode(file_bytes).decode('ascii')}"

    character = CharacterModel(
        name=parsed_card["name"],
        tagline=parsed_card["tagline"],
        description=parsed_card["description"],
        personality=parsed_card["personality"],
        scenario=parsed_card["scenario"],
        first_mes=parsed_card["first_mes"],
        mes_example=parsed_card["mes_example"],
        tags=parsed_card["tags"],
        avatar_url=b64_avatar,
        creator="TavernAI Importer"
    )

    db.add(character)
    await db.commit()
    await db.refresh(character)
    return character

@router.get("/{character_id}/export-png")
async def export_character_to_png(character_id: str, db: AsyncSession = Depends(get_db)):
    """Export character lore embedded as a TavernAI V2 binary PNG card."""
    stmt = select(CharacterModel).where(CharacterModel.id == character_id)
    character = (await db.execute(stmt)).scalar_one_or_none()
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Character with ID '{character_id}' not found."
        )

    # Extract base PNG bytes from avatar_url or generate standard 1x1 fallback
    avatar_url = str(getattr(character, "avatar_url", "") or "")
    if avatar_url and avatar_url.startswith("data:image/png;base64,"):
        raw_b64 = avatar_url.split("base64,")[1]
        base_png_bytes = base64.b64decode(raw_b64)
    else:
        # Minimal 1x1 valid transparent PNG fallback
        base_png_bytes = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")

    char_dict = {
        "name": getattr(character, "name", ""),
        "tagline": getattr(character, "tagline", ""),
        "description": getattr(character, "description", ""),
        "personality": getattr(character, "personality", ""),
        "scenario": getattr(character, "scenario", ""),
        "first_mes": getattr(character, "first_mes", ""),
        "mes_example": getattr(character, "mes_example", ""),
        "tags": getattr(character, "tags", []),
    }

    embedded_png = embed_tavern_card_in_png(base_png_bytes, char_dict)

    safe_filename = "".join(c for c in str(getattr(character, "name", "")) if c.isalnum() or c in (" ", "_", "-")).strip() or "character"
    return Response(
        content=embedded_png,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}.png"'}
    )

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
