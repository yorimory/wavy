import re
from dataclasses import dataclass

from app.models import ModeratedVerdict, ModerationStrictness

# Базовые паттерны: спам-ссылки, повтор символов, типичные мат-шаблоны (укороченный список для диплома)
PROFANITY_PATTERNS_RU = [
    r"\bхуй\w*",
    r"\bпизд\w*",
    r"\bебан\w*",
    r"\bсука\b",
    r"\bбля\w*",
]
SPAM_PATTERNS = [
    r"(https?://\S+).*\1",  # повтор ссылки
    r"(viagra|cialis|casino|лохотрон|заработок без вложений)",
    r"(\S)\1{6,}",  # злоупотребление символами
]


def _match_any(lower: str, patterns: list[str]) -> list[str]:
    flags = []
    for p in patterns:
        if re.search(p, lower, re.IGNORECASE | re.UNICODE):
            flags.append(p)
    return flags


@dataclass
class ModerationResult:
    verdict: ModeratedVerdict
    flags: list[str]
    sanitized_suggestion: str | None


def moderate_text(text: str, strictness: ModerationStrictness) -> ModerationResult:
    lower = text.lower().strip()
    flags: list[str] = []

    spam_hits = _match_any(lower, SPAM_PATTERNS)
    if spam_hits:
        flags.extend([f"spam:{h}" for h in spam_hits])

    prof_hits = _match_any(lower, PROFANITY_PATTERNS_RU)
    if prof_hits:
        flags.extend([f"profanity:{h}" for h in prof_hits])

    # «NLP»: эвристика тональности/длины для дипломного модуля (без внешних API)
    if strictness == ModerationStrictness.high and len(lower) > 400 and lower.count("!") > 6:
        flags.append("nlp:aggressive_punctuation")

    if not flags:
        return ModerationResult(ModeratedVerdict.clean, [], None)

    has_spam = any(f.startswith("spam:") for f in flags)
    has_prof = any(f.startswith("profanity:") for f in flags)
    if has_spam and has_prof:
        verdict = ModeratedVerdict.mixed
    elif has_spam:
        verdict = ModeratedVerdict.spam
    else:
        verdict = ModeratedVerdict.profanity

    suggestion = None
    if verdict != ModeratedVerdict.clean:
        suggestion = "Смягчите формулировки или удалите ссылки; текст может быть скрыт для клиентов."

    return ModerationResult(verdict, flags, suggestion)
