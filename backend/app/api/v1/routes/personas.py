from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import PersonaModel
from app.schemas.persona import PersonaCreate, PersonaRead, PersonaUpdate

router = APIRouter(prefix="/personas", tags=["Personas"])

@router.get("", response_model=list[PersonaRead])
async def get_personas(db: AsyncSession = Depends(get_db)):
    """Fetch all user personas, placing the default active persona first."""
    stmt = select(PersonaModel).order_by(PersonaModel.is_default.desc(), PersonaModel.created_at.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{persona_id}", response_model=PersonaRead)
async def get_persona_by_id(persona_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch a specific user persona by ID."""
    stmt = select(PersonaModel).where(PersonaModel.id == persona_id)
    persona = (await db.execute(stmt)).scalar_one_or_none()
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona with ID '{persona_id}' not found."
        )
    return persona

@router.post("", response_model=PersonaRead, status_code=status.HTTP_201_CREATED)
async def create_persona(data: PersonaCreate, db: AsyncSession = Depends(get_db)):
    """Create a new user persona."""
    if data.is_default:
        await db.execute(update(PersonaModel).values(is_default=False))

    persona = PersonaModel(**data.model_dump(exclude_unset=True))
    db.add(persona)
    await db.commit()
    await db.refresh(persona)
    return persona

@router.put("/{persona_id}", response_model=PersonaRead)
async def update_persona(persona_id: str, data: PersonaUpdate, db: AsyncSession = Depends(get_db)):
    """Update an existing user persona."""
    stmt = select(PersonaModel).where(PersonaModel.id == persona_id)
    persona = (await db.execute(stmt)).scalar_one_or_none()
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona with ID '{persona_id}' not found."
        )

    if data.is_default:
        await db.execute(update(PersonaModel).values(is_default=False))

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(persona, field, value)

    await db.commit()
    await db.refresh(persona)
    return persona

@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_persona(persona_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a user persona by ID."""
    stmt = select(PersonaModel).where(PersonaModel.id == persona_id)
    persona = (await db.execute(stmt)).scalar_one_or_none()
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona with ID '{persona_id}' not found."
        )
    await db.delete(persona)
    await db.commit()
