import base64
import os
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.png_parser import embed_tavern_card_in_png, extract_tavern_card_from_png
from app.db.session import get_db
from app.db.models import CharacterModel
from app.schemas.character import CharacterCreate, CharacterRead, CharacterUpdate

router = APIRouter(prefix="/characters", tags=["Characters"])

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

@router.get("", response_model=list[CharacterRead])
async def get_characters(
    tag: str | None = None,
    search: str | None = None,
    include_hidden: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Fetch characters with optional tag, search, and visibility filters."""
    stmt = select(CharacterModel).order_by(CharacterModel.is_favorite.desc(), CharacterModel.created_at.desc())
    if not include_hidden:
        stmt = stmt.where(CharacterModel.is_hidden == False)  # noqa: E712

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

@router.put("/{character_id}", response_model=CharacterRead)
async def update_character(
    character_id: str,
    data: CharacterUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing character card."""
    stmt = select(CharacterModel).where(CharacterModel.id == character_id)
    character = (await db.execute(stmt)).scalar_one_or_none()
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Character with ID '{character_id}' not found."
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(character, field, value)

    await db.commit()
    await db.refresh(character)
    return character

@router.patch("/{character_id}/visibility", response_model=CharacterRead)
async def toggle_character_visibility(character_id: str, db: AsyncSession = Depends(get_db)):
    """Toggle a character's visibility status (Public vs Hidden)."""
    stmt = select(CharacterModel).where(CharacterModel.id == character_id)
    character = (await db.execute(stmt)).scalar_one_or_none()
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Character with ID '{character_id}' not found."
        )

    current_val = bool(getattr(character, "is_hidden", False))
    setattr(character, "is_hidden", not current_val)
    await db.commit()
    await db.refresh(character)
    return character

@router.post("/import-png", response_model=CharacterRead, status_code=status.HTTP_201_CREATED)
async def import_character_from_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Universal Image & TavernAI Ingestion:
    - Parses embedded metadata if TavernAI V2 PNG.
    - If regular image (PNG/JPG/WEBP), generates a clean draft character ready for in-modal editing.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename."
        )

    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    file_bytes = await file.read()

    # Determine MIME type for Base64 Data URI
    mime_type = "image/png" if ext == ".png" else ("image/webp" if ext == ".webp" else "image/jpeg")
    b64_avatar = f"data:{mime_type};base64,{base64.b64encode(file_bytes).decode('ascii')}"

    # Clean filename into a natural character title (e.g., 'samira_v2.png' -> 'Samira V2')
    base_name = os.path.splitext(file.filename)[0]
    cleaned_name = " ".join(part.capitalize() for part in base_name.replace("_", " ").replace("-", " ").split())

    parsed_card = None
    if ext == ".png":
        try:
            parsed_card = extract_tavern_card_from_png(file_bytes)
        except Exception:
            parsed_card = None

    if parsed_card:
        # Rich TavernAI V2 Card extracted successfully
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
            creator="TavernAI V2 Card",
            is_hidden=False
        )
    else:
        # Standard Raw Image: generate smart customizable draft
        character = CharacterModel(
            name=cleaned_name or "New Companion",
            tagline=f"Custom character created from {file.filename}",
            description=f"A captivating character named {cleaned_name or 'Companion'}.",
            personality="Enigmatic, confident, and ready for adventure.",
            scenario="You meet during your journey across uncharted realms.",
            first_mes=f"*looks in your direction with an attentive gaze.* \"Greetings, traveler. What brings you to this part of the realm?\"",
            mes_example="",
            tags=["Custom", "Adventure"],
            avatar_url=b64_avatar,
            creator="Image Draft (No Metadata)",
            is_hidden=False
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
    if avatar_url and "base64," in avatar_url:
        raw_b64 = avatar_url.split("base64,")[1]
        try:
            base_png_bytes = base64.b64decode(raw_b64)
        except Exception:
            base_png_bytes = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
    else:
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
