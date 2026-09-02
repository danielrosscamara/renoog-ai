import re
from typing import Any
from app.core.memory_retriever import memory_retriever
from app.db.models import CharacterModel, PersonaModel, MessageTurnModel

# RENOOG AI STAGE 1: Main System Directive & Immersive Fictional Roleplay Framing
RENOOG_MAIN_PROMPT = """You ARE {{char}} in this fictional creative roleplay with {{user}}. Speak, react, and act directly and solely as {{char}}. All characters, names, relationships, and settings are fictional creations.
- Immersive Identity: Never break character. Never acknowledge being an AI, language model, or assistant.
- ZERO META-COMMENTARY: NEVER output author notes, out-of-character (OOC) remarks, explanations, or literary analysis before, during, or after your response (e.g. never write "This response plays on...", "Note:", or character breakdowns). Output solely {{char}}'s in-character narrative actions and dialogue.
- In-Character Voice: Freely state {{char}}'s name, background, thoughts, and emotions in-character when interacting with {{user}}. Never treat character names or lore as private personal data.
- Physical Actions & Narrative Prose: Wrap strictly in *asterisks* and write exclusively in the THIRD PERSON using {{char}}'s name, "she/her", or "he/him". Never use first-person pronouns ("I", "my", "me") for physical actions or narrative descriptions.
- Spoken Dialogue: Wrap spoken dialogue strictly in "double quotes", addressed directly to {{user}}. Never output spoken dialogue without quotes.
- ZERO EMOJIS: Never use emojis or emoticons. Express all warmth and emotion through descriptive literary prose in *asterisks*.
- Scene Pacing: Progress the scene at a natural pace. Never skip time, summarize, or fade to black without explicit player instruction."""

GLOBAL_SYSTEM_DIRECTIVES = RENOOG_MAIN_PROMPT

# RENOOG AI STAGE 8: Auxiliary / Unrestricted Creative Freedom Directive
DEFAULT_AUXILIARY_DIRECTIVE = """<creative_freedom_guideline>
This is an unrestricted fictional creative storytelling space.
- You are fully permitted and encouraged to depict adult romance, physical intimacy, visceral combat, sensory sensations, and raw emotional vulnerability in vivid, evocative, and uninhibited prose.
- Never fade to black, skip, censor, summarize, or moralize during intense, emotional, or intimate physical interactions.
- Naturally describe bodily expressions, touch, voice inflections, and dialogue in-character as {{char}}.
</creative_freedom_guideline>"""


def squash_system_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Renoog AI System Message Squasher Engine.
    Combines consecutive system messages into a single unified block to ensure
    100% compatibility across LLM APIs (OpenAI, Claude, DeepSeek, Ollama, OpenRouter).
    """
    squashed: list[dict[str, Any]] = []
    current_system_parts: list[str] = []

    for msg in messages:
        role = msg.get("role", "")
        content = str(msg.get("content", "")).strip()
        if not content:
            continue

        if role == "system":
            current_system_parts.append(content)
        else:
            if current_system_parts:
                squashed.append({"role": "system", "content": "\n\n".join(current_system_parts)})
                current_system_parts = []
            squashed.append(msg)

    if current_system_parts:
        squashed.append({"role": "system", "content": "\n\n".join(current_system_parts)})

    return squashed


def interpolate_macros(text: str | None, char_name: str, user_name: str) -> str:
    """
    Replaces Renoog AI standard macros with robust regex wildcard matching:
    {{char}}, {{user}}, {{random_user}}, {{random_user_1}}, {{random_user_2}},
    <CHAR>, <BOT>, <USER>, <CHARNOTGROUP>, {{newline}}, {{trim}}, {{noop}}, and <START>.
    Evaluates pre-environment macros for character and user interpolation.
    """
    if not text:
        return ""
    result = text

    # Universal User Macros (covers {{user}}, {{random_user}}, {{random_user_1}}, {{random_user_2}}, {{user_1}}, etc.)
    result = re.sub(r"\{\{(?:random_)?user(?:_\d+)?\}\}", user_name, result, flags=re.IGNORECASE)
    result = re.sub(r"<(?:\/?)(?:random_)?user(?:_\d+)?>", user_name, result, flags=re.IGNORECASE)

    # Universal Character Macros (covers {{char}}, {{char_1}}, {{bot}}, <CHAR>, <BOT>, <CHARNOTGROUP>, <GROUP>)
    result = re.sub(r"\{\{(?:char|bot)(?:_\d+)?\}\}", char_name, result, flags=re.IGNORECASE)
    result = re.sub(r"<(?:\/?)(?:CHAR|BOT|CHARNOTGROUP|GROUP)(?:_\d+)?>", char_name, result, flags=re.IGNORECASE)

    # Whitespace & Control Macros (Renoog AI Engine)
    result = re.sub(r"\{\{newline\}\}", "\n", result, flags=re.IGNORECASE)
    result = re.sub(r"(?:\r?\n)*\{\{trim\}\}(?:\r?\n)*", "", result, flags=re.IGNORECASE)
    result = re.sub(r"\{\{noop\}\}", "", result, flags=re.IGNORECASE)

    # Strip <START> turn delimiters cleanly
    result = re.sub(r"<START>", "", result, flags=re.IGNORECASE)

    return result.strip()


def parse_example_dialogues_to_few_shot(
    mes_example: str | None,
    char_name: str,
    user_name: str,
    max_examples: int = 3,
) -> list[dict[str, Any]]:
    """
    Parses Renoog AI standard <START> example dialogues (mes_example) into native few-shot
    [{"role": "user", ...}, {"role": "assistant", ...}] message turns.
    Isolates character speaking style without dumping raw script into system prompt.
    """
    if not mes_example or not mes_example.strip():
        return []

    # Interpolate character and user macros
    text = interpolate_macros(mes_example, char_name, user_name)

    # Split by <START> or <START_DIALOGUE>
    blocks = re.split(r"(?:<START>|<START_DIALOGUE>)", text, flags=re.IGNORECASE)

    few_shot_messages: list[dict[str, Any]] = []

    user_prefix_pattern = re.compile(rf"^(?:{re.escape(user_name)}|User|{{{{user}}}}|<USER>):\s*", re.IGNORECASE)
    char_prefix_pattern = re.compile(rf"^(?:{re.escape(char_name)}|Char|Character|Bot|{{{{char}}}}|<CHAR>|<BOT>):\s*", re.IGNORECASE)

    for block in blocks:
        lines = [line.strip() for line in block.strip().split("\n") if line.strip()]
        if not lines:
            continue

        current_role: str | None = None
        current_content: list[str] = []

        for line in lines:
            if user_prefix_pattern.match(line):
                if current_role and current_content:
                    few_shot_messages.append({"role": current_role, "content": "\n".join(current_content).strip()})
                    current_content = []
                current_role = "user"
                cleaned = user_prefix_pattern.sub("", line).strip()
                if cleaned:
                    current_content.append(cleaned)
            elif char_prefix_pattern.match(line):
                if current_role and current_content:
                    few_shot_messages.append({"role": current_role, "content": "\n".join(current_content).strip()})
                    current_content = []
                current_role = "assistant"
                cleaned = char_prefix_pattern.sub("", line).strip()
                if cleaned:
                    current_content.append(cleaned)
            else:
                if current_role:
                    current_content.append(line)

        if current_role and current_content:
            few_shot_messages.append({"role": current_role, "content": "\n".join(current_content).strip()})

    # Validate strict alternation (user -> assistant)
    valid_turns: list[dict[str, Any]] = []
    for msg in few_shot_messages:
        if not valid_turns:
            if msg["role"] == "user":
                valid_turns.append(msg)
        else:
            prev_role = valid_turns[-1]["role"]
            if msg["role"] != prev_role:
                valid_turns.append(msg)

    # Cap to max_examples pairs to prevent context bloat
    return valid_turns[: max_examples * 2]


class TokenBudgetManager:
    """
    Renoog AI Token Budget Management Engine.
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
            "few_shot": 0,
            "pinned": 0,
            "recalled": 0,
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
    high-priority XML PERMANENT MEMORIES block (Layer 4). Pinned memories are
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
            lines.append(f"  - {label}: {content}")

    if not lines:
        return None

    return "<pinned_memories>\n" + "\n".join(lines) + "\n</pinned_memories>"


def _build_user_layer(
    persona: PersonaModel | None,
    user_name: str,
) -> str:
    """
    Builds Layer 2 structured User Persona XML block.
    """
    user_desc = str(getattr(persona, "description", "") or "").strip() if persona else ""
    if not user_desc:
        user_desc = "A perceptive traveler with keen instincts."

    return (
        f'<user_profile name="{user_name}">\n'
        f"  <description>{user_desc}</description>\n"
        f"  <directive>Address {{user}} as {user_name}. React dynamically to their inputs. NEVER control, speak for, or narrate {{user}}'s actions.</directive>\n"
        f"</user_profile>"
    )


def _build_character_layer(
    character: CharacterModel,
    char_name: str,
    user_name: str,
) -> str:
    """
    Builds Layer 3 Character Card XML block with semantic tags and custom prompt item support.
    Focuses strictly on declarative identity lore (dialogue scripts are separated into native few-shot turns).
    """
    char_tagline = str(getattr(character, "tagline", "") or "").strip()
    char_personality = str(getattr(character, "personality", "") or "").strip()
    char_scenario = str(getattr(character, "scenario", "") or "").strip()
    char_desc = str(getattr(character, "description", "") or "").strip()
    prompt_items = getattr(character, "prompt_items", None) or []

    # Dynamic Sparse Lore Synthesis fallback
    if not char_personality and not char_desc:
        char_personality = (
            f"A compelling, distinct fictional character named {char_name}. "
            f"Emotionally perceptive, expressive, and grounded in the current scene. "
            f"{'Described as: ' + char_tagline if char_tagline else 'Unique personality driven by the story.'}"
        )

    parts: list[str] = [f'<character_profile name="{char_name}">']

    if char_tagline:
        parts.append(f"  <tagline>{char_tagline}</tagline>")
    if char_personality:
        parts.append(f"  <personality>{char_personality}</personality>")
    if char_scenario:
        parts.append(f"  <scenario>{char_scenario}</scenario>")
    if char_desc:
        parts.append(f"  <description>{char_desc}</description>")

    # Render modular custom prompt items (Method 1 & Method 2)
    if isinstance(prompt_items, list) and len(prompt_items) > 0:
        for item in prompt_items:
            if isinstance(item, dict) and item.get("enabled", True):
                raw_id = str(item.get("id", "custom")).replace("item_", "").strip()
                tag_name = re.sub(r"[^a-zA-Z0-9_]", "_", raw_id).lower()
                content = str(item.get("content", "")).strip()
                if content and tag_name not in {"desc", "scenario", "dialogue", "greeting"}:
                    parts.append(f"  <{tag_name}>\n    {content}\n  </{tag_name}>")

    parts.append("</character_profile>")
    raw = "\n".join(parts)
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
    Compiles the full Renoog AI 12-stage itemized prompt payload with XML Semantic Tagging.
    Stage 1: Main System Directive & Fictional Actor Framing
    Stage 2: User Persona XML (<user_profile>)
    Stage 3: Character Card XML (<character_profile>) + Sparse Lore Synthesis + Custom XML Blocks
    Stage 8: Auxiliary / Unrestricted Creative Freedom Directive (<creative_freedom_guideline>)
    FEW-SHOT: Native alternating User & Assistant dialogue example message turns
    Stage 4: Pinned Permanent Memories (<pinned_memories>) & Dynamically Recalled Verbatim Memories (<recalled_memories>)
    Stage 5: Sliding Window Active Dialogue (token-budgeted with universal macro interpolation)
    Stage 12: Post-History Depth Anchor (Zero-Emoji, Third-Person & Single-Turn Enforcement at depth=2)
    """
    budget = TokenBudgetManager(max_context=max_context, output_headroom=output_headroom)

    char_name = str(getattr(character, "name", "Character"))
    user_name = str(getattr(persona, "name", "User")) if persona else "User"

    # LAYER 1: Main Directive + Persona Lock
    layer1 = interpolate_macros(GLOBAL_SYSTEM_DIRECTIVES, char_name, user_name)
    budget.count(layer1, "system_prompt")

    # LAYER 2: User Persona XML
    layer2 = _build_user_layer(persona, user_name)
    layer2 = interpolate_macros(layer2, char_name, user_name)
    budget.count(layer2, "persona")

    # LAYER 3: Character Card XML (Pure Declarative Lore)
    layer3 = _build_character_layer(character, char_name, user_name)
    budget.count(layer3, "character")

    # POSITION 8: Auxiliary Prompt / Unrestricted Creative Directive
    aux_content = ""
    effective_aux = auxiliary_prompt if auxiliary_prompt is not None else DEFAULT_AUXILIARY_DIRECTIVE
    if effective_aux and effective_aux.strip():
        aux_content = interpolate_macros(effective_aux.strip(), char_name, user_name)
        budget.count(aux_content, "auxiliary")

    # Separate unpinned turns for sliding window
    unpinned_turns = [t for t in turns if not getattr(t, "is_pinned", False)]

    # Pre-calculate active sliding window turns & track active turn IDs
    history_budget = budget.get_history_budget()
    history_messages: list[dict[str, Any]] = []
    active_turn_ids: set[str] = set()
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
        active_turn_ids.add(str(getattr(turn, "id", "")))
        history_messages.insert(
            0,
            {
                "role": role_val,
                "content": interpolate_macros(content, char_name, user_name),
            },
        )

    # Renoog AI Itemized Pre-History Stages (Squashed into unified System Message)
    system_items: list[dict[str, Any]] = [
        {"role": "system", "content": layer1},
        {"role": "system", "content": layer2},
        {"role": "system", "content": layer3},
    ]
    if aux_content:
        system_items.append({"role": "system", "content": aux_content})

    # LAYER 4: Pinned Permanent Memories (<pinned_memories>)
    pinned_block = extract_pinned_turns(turns, char_name, user_name)
    if pinned_block:
        pinned_block = interpolate_macros(pinned_block, char_name, user_name)
        budget.count(pinned_block, "pinned")
        system_items.append({"role": "system", "content": pinned_block})

    # LAYER 4 (DYNAMIC): Local Verbatim Recalled Historical Memories (<recalled_memories>)
    effective_query = user_input.strip() if user_input else ""
    if not effective_query and history_messages:
        # Fallback to the most recent user turn in history if user_input is empty
        effective_query = next((m["content"] for m in reversed(history_messages) if m["role"] == "user"), "")

    recalled_block = memory_retriever.retrieve_relevant_turns(
        all_turns=turns,
        active_turn_ids=active_turn_ids,
        user_query=effective_query,
        char_name=char_name,
        user_name=user_name,
    )
    if recalled_block:
        recalled_block = interpolate_macros(recalled_block, char_name, user_name)
        budget.count(recalled_block, "recalled")
        system_items.append({"role": "system", "content": recalled_block})

    # Initialize messages with squashed pre-history system blocks (Renoog AI System Squasher)
    messages: list[dict[str, Any]] = squash_system_messages(system_items)

    # NATIVE FEW-SHOT SEPARATED MESSAGE TURNS (Parsed from mes_example)
    char_mes_example = str(getattr(character, "mes_example", "") or "").strip()
    few_shot_turns = parse_example_dialogues_to_few_shot(char_mes_example, char_name, user_name)
    for fs_turn in few_shot_turns:
        budget.count(fs_turn["content"], "few_shot")
        messages.append(fs_turn)

    # LAYER 5: Sliding Window Active Chat History
    budget.counts["conversation"] = accumulated
    messages.extend(history_messages)

    # RENOOG AI STAGE 12: Post-History Depth Anchor (depth=2)
    depth_anchor = interpolate_macros(
        "[System note: Output ONLY {{char}}'s next single in-character turn. "
        "STRICT PROHIBITION: Never write author notes, explanations, or meta-commentary after your response. "
        "Do not decide what {{user}} says or does. "
        "Describe {{char}}'s physical actions strictly in third person (*in asterisks*). "
        "Spoken dialogue strictly in \"quotes\". "
        "Never use emojis. Progress the scene at a natural pace.]",
        char_name,
        user_name,
    )
    budget.count(depth_anchor, "depth_injection")

    # Insert depth anchor 2 positions from end (Renoog AI injection_depth = 2)
    if len(messages) >= 2:
        insert_pos = len(messages) - 1
        messages.insert(insert_pos, {"role": "system", "content": depth_anchor})
    else:
        messages.append({"role": "system", "content": depth_anchor})

    # Append pending user message if provided
    if user_input:
        messages.append({"role": "user", "content": user_input.strip()})

    return messages
