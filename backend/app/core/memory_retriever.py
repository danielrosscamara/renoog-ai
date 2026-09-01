import math
import re
from typing import Any
from app.db.models import MessageTurnModel

# Common English stopwords to ignore during keyword indexing
STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
    "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
    "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
    "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
    "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
    "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves", "hi", "hello", "hey", "yes", "yeah", "ok", "okay"
}


def tokenize(text: str) -> list[str]:
    """Extracts normalized alphanumeric keywords, stripping punctuation and stopwords."""
    words = re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", text.lower())
    return [w for w in words if w not in STOPWORDS]


class LocalMemoryRetriever:
    """
    In-process BM25 verbatim semantic retrieval engine for historical chat turns.
    Evaluates past turns outside the active sliding window and retrieves top-k
    relevant dialogue exchanges word-for-word.
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75, score_threshold: float = 1.2):
        self.k1 = k1
        self.b = b
        self.score_threshold = score_threshold

    def retrieve_relevant_turns(
        self,
        all_turns: list[MessageTurnModel],
        active_turn_ids: set[str],
        user_query: str,
        char_name: str,
        user_name: str,
        max_results: int = 2,
    ) -> str | None:
        """
        Scans historical turns (excluding active window & pinned turns),
        scores them with BM25 against user_query, and returns formatted XML.
        """
        query_tokens = tokenize(user_query)
        if not query_tokens:
            return None

        # Filter to historical unpinned turns outside active sliding window
        candidates: list[tuple[int, MessageTurnModel]] = []
        for idx, turn in enumerate(all_turns, start=1):
            turn_id = str(getattr(turn, "id", ""))
            is_pinned = bool(getattr(turn, "is_pinned", False))
            if turn_id in active_turn_ids or is_pinned:
                continue

            swipes = getattr(turn, "swipes", []) or []
            active_idx = int(getattr(turn, "active_index", 0) or 0)
            chosen_idx = active_idx if 0 <= active_idx < len(swipes) else 0
            content = str(swipes[chosen_idx]).strip() if (swipes and len(swipes) > chosen_idx) else ""
            if content:
                candidates.append((idx, turn))

        if not candidates:
            return None

        # Build corpus and document statistics
        doc_tokens: list[list[str]] = []
        for _, turn in candidates:
            swipes = getattr(turn, "swipes", []) or []
            active_idx = int(getattr(turn, "active_index", 0) or 0)
            chosen_idx = active_idx if 0 <= active_idx < len(swipes) else 0
            text = str(swipes[chosen_idx])
            doc_tokens.append(tokenize(text))

        n_docs = len(candidates)
        avgdl = sum(len(d) for d in doc_tokens) / max(1, n_docs)

        # Calculate BM25 scores
        scored_results: list[tuple[float, int, MessageTurnModel]] = []

        for i, (turn_num, turn) in enumerate(candidates):
            tokens = doc_tokens[i]
            doc_len = len(tokens)
            score = 0.0

            for q_term in query_tokens:
                # Document frequency (how many docs contain q_term)
                df = sum(1 for d in doc_tokens if q_term in d)
                if df == 0:
                    continue

                # Term frequency in current doc
                tf = tokens.count(q_term)
                if tf == 0:
                    continue

                # Standard Lucene/BM25 IDF formula
                idf = math.log(1 + (n_docs - df + 0.5) / (df + 0.5))
                numerator = tf * (self.k1 + 1)
                denominator = tf + self.k1 * (1 - self.b + self.b * (doc_len / avgdl))
                score += idf * (numerator / denominator)

            if score >= self.score_threshold:
                scored_results.append((score, turn_num, turn))

        if not scored_results:
            return None

        # Sort descending by relevance score and pick top-k
        scored_results.sort(key=lambda x: x[0], reverse=True)
        top_matches = scored_results[:max_results]

        # Format into clean XML container
        lines: list[str] = [
            "<recalled_memories>",
            "  <!-- The following are verbatim past exchanges recalled from earlier in this story based on relevance to the current scene. -->"
        ]

        for score, turn_num, turn in top_matches:
            role_val = str(getattr(turn, "role", "user"))
            speaker = char_name if role_val == "assistant" else user_name
            swipes = getattr(turn, "swipes", []) or []
            active_idx = int(getattr(turn, "active_index", 0) or 0)
            chosen_idx = active_idx if 0 <= active_idx < len(swipes) else 0
            content = str(swipes[chosen_idx]).strip()

            lines.append(f'  <past_exchange turn="{turn_num}">')
            lines.append(f"    {speaker}: {content}")
            lines.append("  </past_exchange>")

        lines.append("</recalled_memories>")
        return "\n".join(lines)


# Global singleton instance for high-speed reuse
memory_retriever = LocalMemoryRetriever()
