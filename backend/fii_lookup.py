from __future__ import annotations

import csv
import re
from pathlib import Path
from typing import Optional

_FII_CSV_PATH = Path(__file__).resolve().parent / "fii_foods.csv"
_FII_DATA_LOADED = False
_FII_ROWS: list[dict[str, object]] = []
_FOOD_NAME_INDEX: dict[str, dict[str, object]] = {}
_ALIAS_INDEX: dict[str, dict[str, object]] = {}
_MIXED_MEAL_WORD_MARKERS = {
    "bowl",
    "combo",
    "plate",
    "biryani",
    "curry",
    "sandwich",
    "burger",
    "meal",
}
_MAJOR_FOOD_TOKENS = {
    "rice",
    "potato",
    "chicken",
    "beef",
    "fish",
    "egg",
    "eggs",
    "toast",
    "bread",
    "oats",
    "milk",
    "yogurt",
    "lentils",
    "dal",
    "beans",
    "noodles",
    "pasta",
}


def normalize_food_name(name: str) -> str:
    normalized = re.sub(r"[^a-z0-9\s]+", " ", (name or "").lower())
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def _tokenize(name: str) -> list[str]:
    normalized = normalize_food_name(name)
    if not normalized:
        return []
    return normalized.split()


def _is_token_subset_phrase(query_tokens: list[str], candidate_tokens: list[str]) -> bool:
    if not query_tokens or not candidate_tokens:
        return False
    if len(query_tokens) == 1 or len(candidate_tokens) == 1:
        # Avoid broad one-token fuzzy matches (e.g., "oil" -> "boiled egg").
        return False
    query_set = set(query_tokens)
    candidate_set = set(candidate_tokens)
    overlap = len(query_set & candidate_set)
    if overlap < 2:
        return False
    return query_set.issubset(candidate_set) or candidate_set.issubset(query_set)


def is_likely_mixed_meal(food_name: str) -> bool:
    raw = (food_name or "").lower()
    normalized = normalize_food_name(food_name)
    if not normalized:
        return False

    if " and " in normalized or " with " in normalized or "+" in raw:
        return True

    tokens = normalized.split()
    if any(marker in tokens for marker in _MIXED_MEAL_WORD_MARKERS):
        return True

    major_tokens = {token for token in tokens if token in _MAJOR_FOOD_TOKENS}
    if len(major_tokens) >= 2:
        return True

    return False


def _parse_aliases(aliases_raw: str) -> list[str]:
    if not aliases_raw:
        return []
    return [
        normalize_food_name(alias)
        for alias in aliases_raw.split(",")
        if normalize_food_name(alias)
    ]


def load_fii_data() -> None:
    global _FII_DATA_LOADED
    if _FII_DATA_LOADED:
        return

    rows: list[dict[str, object]] = []
    index: dict[str, dict[str, object]] = {}
    alias_index: dict[str, dict[str, object]] = {}

    with _FII_CSV_PATH.open("r", encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for raw in reader:
            food_name = normalize_food_name(raw.get("food_name", ""))
            if not food_name:
                continue

            try:
                fii_value = float(raw.get("fii", ""))
            except (TypeError, ValueError):
                continue

            try:
                confidence_value = float(raw.get("confidence", ""))
            except (TypeError, ValueError):
                confidence_value = 0.5

            row = {
                "food_name": food_name,
                "aliases": _parse_aliases(raw.get("aliases", "")),
                "fii": fii_value,
                "source": raw.get("source", ""),
                "confidence": confidence_value,
            }
            rows.append(row)
            index[food_name] = row
            for alias in row["aliases"]:
                alias_name = str(alias)
                if alias_name and alias_name not in alias_index:
                    alias_index[alias_name] = row

    _FII_ROWS.clear()
    _FII_ROWS.extend(rows)
    _FOOD_NAME_INDEX.clear()
    _FOOD_NAME_INDEX.update(index)
    _ALIAS_INDEX.clear()
    _ALIAS_INDEX.update(alias_index)
    _FII_DATA_LOADED = True


def lookup_fii(food_name: str) -> tuple[float | None, str | None, float | None]:
    load_fii_data()
    normalized = normalize_food_name(food_name)
    if not normalized:
        return None, None, None

    # 1) exact match on normalized primary food name
    exact = _FOOD_NAME_INDEX.get(normalized)
    if exact is not None:
        return float(exact["fii"]), "exact_fii", float(exact["confidence"])

    # 2) exact match against aliases
    alias_match = _ALIAS_INDEX.get(normalized)
    if alias_match is not None:
        return float(alias_match["fii"]), "exact_fii", float(alias_match["confidence"])

    # 3) conservative token-aware fuzzy match for non-mixed single foods
    if not is_likely_mixed_meal(food_name):
        query_tokens = _tokenize(normalized)
        for row in _FII_ROWS:
            primary_name = str(row["food_name"])
            primary_tokens = _tokenize(primary_name)
            if _is_token_subset_phrase(query_tokens, primary_tokens):
                return float(row["fii"]), "mapped_fii", float(row["confidence"])
            for alias in row.get("aliases", []):
                alias_name = str(alias)
                alias_tokens = _tokenize(alias_name)
                if _is_token_subset_phrase(query_tokens, alias_tokens):
                    return float(row["fii"]), "mapped_fii", float(row["confidence"])

    return None, None, None


def run_self_check() -> None:
    checks = ["Rice", "basmati rice", "greek yogurt", "steak", "rolled oats"]
    for query in checks:
        fii, source_label, confidence = lookup_fii(query)
        print(f"{query!r} -> fii={fii}, source={source_label}, confidence={confidence}")


if __name__ == "__main__":
    run_self_check()
