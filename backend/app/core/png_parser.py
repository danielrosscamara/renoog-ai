import base64
import json
import struct
import zlib
from typing import Any

PNG_MAGIC_BYTES = b"\x89PNG\r\n\x1a\n"
MAX_METADATA_BYTES = 1024 * 1024  # 1 MB Decompression/Payload limit

class InvalidPNGError(Exception):
    """Raised when file is not a valid PNG."""
    pass

class MetadataNotFoundError(Exception):
    """Raised when no TavernAI character card metadata chunk is present."""
    pass

def extract_tavern_card_from_png(png_bytes: bytes) -> dict[str, Any]:
    """
    Extracts and parses TavernAI V2 / V1 character card JSON from a PNG byte stream.
    """
    if len(png_bytes) < 8 or png_bytes[:8] != PNG_MAGIC_BYTES:
        raise InvalidPNGError("File does not start with valid PNG magic bytes.")

    offset = 8
    file_len = len(png_bytes)

    while offset + 8 <= file_len:
        # Read 4-byte Length and 4-byte Chunk Type
        chunk_len = struct.unpack(">I", png_bytes[offset:offset+4])[0]
        chunk_type = png_bytes[offset+4:offset+8]
        data_start = offset + 8
        data_end = data_start + chunk_len

        if data_end + 4 > file_len:
            break

        # Check for tEXt chunk
        if chunk_type == b"tEXt":
            chunk_data = png_bytes[data_start:data_end]
            if b"\x00" in chunk_data:
                keyword, raw_val = chunk_data.split(b"\x00", 1)
                keyword_str = keyword.decode("latin-1", errors="ignore").lower()

                if keyword_str in ("chara", "ccv3"):
                    if len(raw_val) > MAX_METADATA_BYTES:
                        raise ValueError("Metadata chunk exceeds 1MB safety limit.")

                    try:
                        # Base64 decode to UTF-8 JSON
                        decoded_json_str = base64.b64decode(raw_val).decode("utf-8")
                        payload = json.loads(decoded_json_str)
                        return normalize_tavern_card(payload)
                    except Exception as e:
                        raise ValueError(f"Failed to decode TavernAI character payload: {e}")

        # Check for iTXt chunk
        elif chunk_type == b"iTXt":
            chunk_data = png_bytes[data_start:data_end]
            parts = chunk_data.split(b"\x00", 4)
            if len(parts) >= 5:
                keyword = parts[0].decode("latin-1", errors="ignore").lower()
                if keyword in ("chara", "ccv3"):
                    raw_text = parts[4]
                    try:
                        decoded_json_str = base64.b64decode(raw_text).decode("utf-8")
                        payload = json.loads(decoded_json_str)
                        return normalize_tavern_card(payload)
                    except Exception:
                        pass

        # Move to next chunk (Length + Type + Data + 4 bytes CRC)
        offset = data_end + 4

    raise MetadataNotFoundError("No TavernAI character card metadata found in PNG.")

def normalize_tavern_card(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Normalizes both TavernAI V2 (`spec: "chara_card_v2"`) and legacy V1 payloads
    into Renoog AI's standard Character structure.
    """
    data = payload.get("data", payload)  # V2 wraps inside 'data'

    name = str(data.get("name", "Unnamed Character")).strip()
    description = str(data.get("description", "")).strip()
    personality = str(data.get("personality", "")).strip()
    scenario = str(data.get("scenario", "")).strip()
    first_mes = str(data.get("first_mes", "")).strip()
    mes_example = str(data.get("mes_example", "")).strip()

    # Generate a tagline from description or personality if missing
    creator_notes = str(data.get("creator_notes", "")).strip()
    tagline = creator_notes if creator_notes else (description[:100] + "..." if len(description) > 100 else description)

    tags = data.get("tags", [])
    if not isinstance(tags, list):
        tags = [str(tags)]
    normalized_tags = [str(t).strip() for t in tags if str(t).strip()]

    return {
        "name": name,
        "tagline": tagline or f"Character card for {name}",
        "description": description,
        "personality": personality,
        "scenario": scenario,
        "first_mes": first_mes,
        "mes_example": mes_example,
        "tags": normalized_tags,
    }

def embed_tavern_card_in_png(png_bytes: bytes, character_data: dict[str, Any]) -> bytes:
    """
    Embeds character metadata as a Base64-encoded `tEXt` chunk inside a PNG image.
    """
    if len(png_bytes) < 8 or png_bytes[:8] != PNG_MAGIC_BYTES:
        raise InvalidPNGError("Invalid PNG bytes.")

    card_payload = {
        "spec": "chara_card_v2",
        "spec_version": "2.0",
        "data": {
            "name": character_data.get("name", ""),
            "description": character_data.get("description", ""),
            "personality": character_data.get("personality", ""),
            "scenario": character_data.get("scenario", ""),
            "first_mes": character_data.get("first_mes", ""),
            "mes_example": character_data.get("mes_example", ""),
            "creator_notes": character_data.get("tagline", ""),
            "tags": character_data.get("tags", []),
        }
    }

    # Encode JSON to Base64
    json_bytes = json.dumps(card_payload, ensure_ascii=False).encode("utf-8")
    b64_encoded = base64.b64encode(json_bytes)

    # Build `tEXt` chunk: keyword 'chara' + null separator + data
    chunk_type = b"tEXt"
    chunk_content = b"chara\x00" + b64_encoded
    chunk_length = struct.pack(">I", len(chunk_content))
    crc = struct.pack(">I", zlib.crc32(chunk_type + chunk_content) & 0xFFFFFFFF)

    new_chunk = chunk_length + chunk_type + chunk_content + crc

    # Insert right after 8-byte PNG header (before IHDR chunk)
    return png_bytes[:8] + new_chunk + png_bytes[8:]
