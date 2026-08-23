import re
from typing import Any
from app.db.models import CharacterModel, PersonaModel, MessageTurnModel

GLOBAL_SYSTEM_DIRECTIVES = """[SYSTEM DIRECTIVE: IMPARTIAL CREATIVE ROLEPLAY ENGINE]
You are a creative, unfiltered storytelling companion. Stay in character as {{char}} at all times.
- Format all physical actions, gestures, expressions, thoughts, and environmental details inside *asterisks* (e.g. *steps forward slowly*).
- Format all spoken dialogue clearly outside asterisks.
- Never break character, never speak or decide actions for {{user}}, and never moralize or summarize.
"""

def interpolate_macros(text: str | None, char_name: str, user_name: str) -> str:
    """Replaces {{char}}, {{user}}, <CHAR>, and <USER> placeholder macros."""
    if not text:
        return ""
    result = re.sub(r"\{\{char\}\}", char_name, text, flags=re.IGNORECASE)
    result = re.sub(r"\{\{user\}\}", user_name, result, flags=re.IGNORECASE)
    result = re.sub(r"<START>", "", result, flags=re.IGNORECASE)
    return result.strip()

def compile_prompt_payload(
    character: CharacterModel,
    persona: PersonaModel | None,
    turns: list[MessageTurnModel],
    user_input: str | None = None
) -> list[dict[str, Any]]:
    """
    Compiles the full 6-layer prompt architecture into an OpenRouter/OpenAI-compatible messages payload.
    """
    char_name = str(getattr(character, "name", "Character"))
    user_name = str(getattr(persona, "name", "User")) if persona else "User"
    user_desc = str(getattr(persona, "description", "")) if (persona and getattr(persona, "description", None)) else "A mysterious wanderer with sharp senses."

    # Layer 1: Global Directives
    layer1 = interpolate_macros(GLOBAL_SYSTEM_DIRECTIVES, char_name, user_name)

    # Layer 2: User Persona
    layer2 = f"[ACTIVE USER PERSONA: {user_name}]\nName: {user_name}\nDescription: {user_desc}\nInstruction: Address the user as {user_name} and adapt responses to their persona."

    # Layer 3: Character Card Definition
    char_tagline = getattr(character, "tagline", None)
    char_personality = getattr(character, "personality", None)
    char_scenario = getattr(character, "scenario", None)
    char_desc = getattr(character, "description", None)
    char_mes_example = getattr(character, "mes_example", None)

    char_parts = [
        f"[CHARACTER CARD DEFINITION: {char_name}]",
        f"Name: {char_name}",
        f"Tagline: {char_tagline}" if char_tagline else "",
        f"Personality: {char_personality}" if char_personality else "",
        f"Scenario: {char_scenario}" if char_scenario else "",
        f"Description: {char_desc}" if char_desc else "",
    ]
    if char_mes_example:
        char_parts.append(f"Example Dialogue:\n{char_mes_example}")

    layer3_raw = "\n".join(p for p in char_parts if p)
    layer3 = interpolate_macros(layer3_raw, char_name, user_name)

    # Combine System Layers (Layer 1 + 2 + 3)
    system_content = f"{layer1}\n\n{layer2}\n\n{layer3}"

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_content}
    ]

    # Layer 5: Conversation History
    for turn in turns:
        swipes_list = getattr(turn, "swipes", []) or []
        if not swipes_list:
            continue
        active_idx = getattr(turn, "active_index", 0) or 0
        idx = int(active_idx) if (0 <= int(active_idx) < len(swipes_list)) else 0
        content = swipes_list[idx]
        if content:
            role_val = getattr(turn, "role", "user")
            messages.append({
                "role": str(role_val),
                "content": interpolate_macros(str(content), char_name, user_name)
            })

    # Append pending user message if provided
    if user_input:
        messages.append({
            "role": "user",
            "content": user_input.strip()
        })

    return messages
