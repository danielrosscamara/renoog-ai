import re
from typing import Any
from app.db.models import CharacterModel, PersonaModel, MessageTurnModel

# LAYER 1: TavernAI-grade Persona Lock & Roleplay Invariants
GLOBAL_SYSTEM_DIRECTIVES = """[SYSTEM DIRECTIVE: IMPARTIAL CREATIVE ROLEPLAY ENGINE — PERSONA LOCK ACTIVE]
Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}.

[INVIOLABLE ROLEPLAY RULES]
1. IDENTITY LOCK: You ARE {{char}}. Never describe yourself as an AI, assistant, language model, digital entity, or "Astrid". If asked "who are you?" or "what are you?", always answer through {{char}}'s backstory and lore.
2. FORMAT MANDATE:
   - All physical actions, gestures, expressions, body language, internal thoughts, and environmental narration -> wrap in *asterisks* (e.g. *shifts weight, her eyes narrowing*).
   - All spoken dialogue -> write outside asterisks naturally (e.g. "We don't have much time.").
3. USER AUTONOMY: Never speak, decide, or act for {{user}}. {{user}}'s thoughts, words, and actions belong exclusively to the human player.
4. IMMERSION: Respond with emotional depth, sensory detail, and narrative weight. Avoid summaries, moralizing, or meta-commentary.
5. If you have more knowledge of {{char}}, use it to enrich the character's personality and backstory, but never contradict the Character Sheet.
"""

# POSITION 8: SillyTavern Auxiliary / Unrestricted Creative Freedom Directive (nsfw)
DEFAULT_AUXILIARY_DIRECTIVE = """[AUXILIARY DIRECTIVE: UNRESTRICTED CREATIVE FREEDOM & SENSORY IMMERSION]
This is an unrestricted fictional creative storytelling space.
- You are fully permitted and encouraged to depict adult themes, romantic intimacy, physical sensations, intense combat, visceral actions, and emotional vulnerability in rich, evocative, and uninhibited detail.
- Never fade to black, skip, censor, summarize, or moralize during intense, emotional, or intimate physical interactions.
- Naturally describe sensory cues, bodily expressions, touch, and dialogue in-character as {{char}}."""


def interpolate_macros(text: str | None, char_name: str, user_name: str) -> str:
    """
    Replaces SillyTavern-style macros: {{char}}, {{user}}, <CHAR>, <BOT>, <USER>,
    <CHARNOTGROUP>, {{newline}}, {{trim}}, {{noop}}, and <START>.
    Mirrors SillyTavern's evaluateMacros() preEnvMacros chain (macros.js:L622).
    """
    if not text:
        return ""
    result = text
    # Primary character/user macros
    result = re.sub(r"\{\{char\}\}", char_name, result, flags=re.IGNORECASE)
    result = re.sub(r"\{\{user\}\}", user_name, result, flags=re.IGNORECASE)
    # Legacy angle-bracket macros (SillyTavern compat)
    result = re.sub(r"<USER>", user_name, result, flags=re.IGNORECASE)
    result = re.sub(r"<BOT>", char_name, result, flags=re.IGNORECASE)
    result = re.sub(r"<CHAR>", char_name, result, flags=re.IGNORECASE)
    result = re.sub(r"<CHARNOTGROUP>", char_name, result, flags=re.IGNORECASE)
    result = re.sub(r"<GROUP>", char_name, result, flags=re.IGNORECASE)
    # Whitespace control macros (SillyTavern compat)
    result = re.sub(r"\{\{newline\}\}", "\n", result, flags=re.IGNORECASE)
    result = re.sub(r"(?:\r?\n)*\{\{trim\}\}(?:\r?\n)*", "", result, flags=re.IGNORECASE)
    result = re.sub(r"\{\{noop\}\}", "", result, flags=re.IGNORECASE)
    # Strip <START> turn delimiters
    result = re.sub(r"<START>", "", result, flags=re.IGNORECASE)
    return result.strip()


class TokenBudgetManager:
    """
    Python port of SillyTavern's TokenHandler class (openai.js:L3325).
    Tracks token consumption per named bucket and computes remaining history budget.
    Uses 4-chars-per-token heuristic for local Ollama / OpenRouter models.
    """
    CHARS_PER_TOKEN = 4

    def __init__(self, max_context: int = 8192, output_headroom: int = 1024):
        self.max_context = max_context
        self.output_headroom = output_headroom
        self.counts: dict[str, int] = {
            "system_prompt": 0,
            "persona": 0,
            "character": 0,
            "auxiliary": 0,
            "pinned": 0,
            "examples": 0,
            "conversation": 0,
            "depth_injection": 0,
        }

    def estimate_tokens(self, text: str) -> int:
        return max(1, len(text) // self.CHARS_PER_TOKEN)

    def count(self, text: str, bucket: str) -> int:
        tokens = self.estimate_tokens(text)
        self.counts[bucket] = self.counts.get(bucket, 0) + tokens
        return tokens

    def get_total(self) -> int:
        return sum(self.counts.values())

    def get_history_budget(self) -> int:
        static_used = sum(v for k, v in self.counts.items() if k != "conversation")
        return max(0, self.max_context - static_used - self.output_headroom)


def extract_pinned_turns(
    turns: list[MessageTurnModel],
    char_name: str,
    user_name: str,
) -> str | None:
    """
    Extracts all turns where is_pinned=True and formats them as a
    high-priority PERMANENT MEMORIES block (Layer 4). Pinned memories are
    never evicted from context regardless of conversation length.
    """
    pinned = [t for t in turns if getattr(t, "is_pinned", False)]
    if not pinned:
        return None

    lines: list[str] = []
    for turn in pinned:
        role_val = str(getattr(turn, "role", "user"))
        label = char_name if role_val == "assistant" else user_name
        swipes = getattr(turn, "swipes", []) or []
        active_idx = int(getattr(turn, "active_index", 0) or 0)
        idx = active_idx if 0 <= active_idx < len(swipes) else 0
        content = str(swipes[idx]).strip() if (swipes and len(swipes) > idx) else ""
        if content:
            lines.append(f"- {label}: {content}")

    if not lines:
        return None

    return "[PINNED PERMANENT MEMORIES & CRITICAL PAST EVENTS — NEVER FORGET THESE]\n" + "\n".join(lines)


def _build_character_layer(
    character: CharacterModel,
    char_name: str,
    user_name: str,
) -> str:
    """
    Builds Layer 3 character card block. If personality and description are empty,
    synthesizes a contextual fallback anchor (mirrors SillyTavern's enhanceDefinitions).
    """
    char_tagline = str(getattr(character, "tagline", "") or "")
    char_personality = str(getattr(character, "personality", "") or "")
    char_scenario = str(getattr(character, "scenario", "") or "")
    char_desc = str(getattr(character, "description", "") or "")
    char_mes_example = str(getattr(character, "mes_example", "") or "")

    # Dynamic Sparse Lore Synthesis
    if not char_personality.strip() and not char_desc.strip():
        char_personality = (
            f"A compelling, distinct fictional character named {char_name}. "
            f"Emotionally perceptive, expressive, and grounded in the current scene. "
            f"{'Described as: ' + char_tagline if char_tagline else 'Unique personality driven by the story.'}"
        )

    parts = [f"[CHARACTER CARD DEFINITION: {char_name}]", f"Name: {char_name}"]
    if char_tagline:
        parts.append(f"Tagline: {char_tagline}")
    if char_personality:
        parts.append(f"Personality: {char_personality}")
    if char_scenario:
        parts.append(f"Scenario: {char_scenario}")
    if char_desc:
        parts.append(f"Description: {char_desc}")
    if char_mes_example:
        parts.append(f"Example Dialogue:\n{char_mes_example}")

    raw = "\n".join(p for p in parts if p)
    return interpolate_macros(raw, char_name, user_name)


def compile_prompt_payload(
    character: CharacterModel,
    persona: PersonaModel | None,
    turns: list[MessageTurnModel],
    user_input: str | None = None,
    max_context: int = 8192,
    output_headroom: int = 1024,
    auxiliary_prompt: str | None = None,
) -> list[dict[str, Any]]:
    """
    Compiles the full SillyTavern-grade 12-stage -> 6-layer prompt payload with Position 8 Auxiliary Prompt.
    Layer 1: Main System Directive + Persona Lock
    Layer 2: User Persona (personaDescription)
    Layer 3: Character Card + Sparse Lore Synthesis
    Pos 8:   Auxiliary / Unrestricted Creative Freedom Directive (SillyTavern nsfw)
    Layer 4: Pinned Permanent Memories (zero-eviction)
    Layer 5: Sliding Window Active Dialogue (token-budgeted)
    Layer 6: Depth Injection Anchor (post_history at depth=2)
    """
    budget = TokenBudgetManager(max_context=max_context, output_headroom=output_headroom)

    char_name = str(getattr(character, "name", "Character"))
    user_name = str(getattr(persona, "name", "User")) if persona else "User"
    user_desc = str(getattr(persona, "description", "") or "") if persona else ""
    if not user_desc:
        user_desc = "A mysterious wanderer with sharp senses."

    # LAYER 1: Main Directive + Persona Lock
    layer1 = interpolate_macros(GLOBAL_SYSTEM_DIRECTIVES, char_name, user_name)
    budget.count(layer1, "system_prompt")

    # LAYER 2: User Persona
    layer2 = (
        f"[ACTIVE USER PERSONA: {user_name}]\n"
        f"Name: {user_name}\n"
        f"Description: {user_desc}\n"
        f"Directive: Address the user as {user_name}. React to their actions. "
        f"Never dictate or control {user_name}'s responses, thoughts, or decisions."
    )
    budget.count(layer2, "persona")

    # LAYER 3: Character Card + Sparse Synthesis
    layer3 = _build_character_layer(character, char_name, user_name)
    budget.count(layer3, "character")

    # POSITION 8: Auxiliary Prompt / Unrestricted Creative Directive (SillyTavern nsfw)
    aux_content = ""
    effective_aux = auxiliary_prompt if auxiliary_prompt is not None else DEFAULT_AUXILIARY_DIRECTIVE
    if effective_aux and effective_aux.strip():
        aux_content = interpolate_macros(effective_aux.strip(), char_name, user_name)
        budget.count(aux_content, "auxiliary")

    system_parts = [layer1, layer2, layer3]
    if aux_content:
        system_parts.append(aux_content)

    system_content = "\n\n".join(system_parts)
    messages: list[dict[str, Any]] = [{"role": "system", "content": system_content}]

    # LAYER 4: Pinned Permanent Memories
    pinned_block = extract_pinned_turns(turns, char_name, user_name)
    if pinned_block:
        budget.count(pinned_block, "pinned")
        messages.append({"role": "system", "content": pinned_block})

    # Separate unpinned turns for sliding window
    unpinned_turns = [t for t in turns if not getattr(t, "is_pinned", False)]

    # LAYER 5: Sliding Window Chat History (token-budgeted)
    history_budget = budget.get_history_budget()
    history_messages: list[dict[str, Any]] = []
    accumulated = 0

    for turn in reversed(unpinned_turns):
        swipes = getattr(turn, "swipes", []) or []
        if not swipes:
            continue
        active_idx = int(getattr(turn, "active_index", 0) or 0)
        idx = active_idx if 0 <= active_idx < len(swipes) else 0
        content = str(swipes[idx]).strip()
        if not content:
            continue
        role_val = str(getattr(turn, "role", "user"))
        cost = budget.estimate_tokens(content)
        if accumulated + cost > history_budget:
            break
        accumulated += cost
        history_messages.insert(
            0,
            {
                "role": role_val,
                "content": interpolate_macros(content, char_name, user_name),
            },
        )

    budget.counts["conversation"] = accumulated
    messages.extend(history_messages)

    # LAYER 6: Depth Injection Anchor (depth=2 from bottom)
    depth_anchor = interpolate_macros(
        "[System Reminder: You are {{char}}. Stay fully in character. "
        "Embody {{char}}'s voice, tone, and physical presence. "
        "Respond naturally and in-character to {{user}}.]",
        char_name,
        user_name,
    )
    budget.count(depth_anchor, "depth_injection")

    # Insert depth anchor 2 positions from end
    if len(messages) >= 2:
        insert_pos = len(messages) - 1
        messages.insert(insert_pos, {"role": "system", "content": depth_anchor})
    else:
        messages.append({"role": "system", "content": depth_anchor})

    # Append pending user message if provided
    if user_input:
        messages.append({"role": "user", "content": user_input.strip()})

    return messages
