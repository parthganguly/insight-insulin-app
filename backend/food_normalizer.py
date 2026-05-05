import re


def normalize_text(text: str) -> str:
    normalized = re.sub(r"[^a-z0-9\s]+", " ", (text or "").lower())
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def decompose_food_name_weighted(food_name: str) -> list[dict]:
    """
    First-pass mixed-meal decomposition layer using weighted component shares.
    Weighted decomposition is more physiologically realistic than equal splitting
    because mixed meals are not composed of each component in equal kcal amounts.
    This remains a heuristic; future versions can use cuisine-specific learned
    weights from intake logs and outcomes.
    """
    normalized = normalize_text(food_name)
    if not normalized:
        return []

    # Keep specific phrases first so they win over more generic matching.
    phrase_rules: list[tuple[str, list[dict]]] = [
        (
            "chicken biryani",
            [{"food": "rice", "weight": 0.60}, {"food": "chicken", "weight": 0.25}, {"food": "oil", "weight": 0.15}],
        ),
        ("rice and chicken", [{"food": "rice", "weight": 0.65}, {"food": "chicken", "weight": 0.35}]),
        ("greek yogurt bowl", [{"food": "yogurt", "weight": 1.0}]),
        ("steak and potatoes", [{"food": "beef", "weight": 0.60}, {"food": "potato", "weight": 0.40}]),
        ("dal rice", [{"food": "lentils", "weight": 0.45}, {"food": "rice", "weight": 0.55}]),
        ("milk and oats", [{"food": "milk", "weight": 0.40}, {"food": "oats", "weight": 0.60}]),
        ("egg and toast", [{"food": "egg", "weight": 0.40}, {"food": "white bread", "weight": 0.60}]),
    ]
    for phrase, components in phrase_rules:
        if phrase in normalized:
            return components

    keyword_rules: list[tuple[list[str], list[dict]]] = [
        (
            ["biryani"],
            [{"food": "rice", "weight": 0.60}, {"food": "chicken", "weight": 0.25}, {"food": "oil", "weight": 0.15}],
        ),
        (["greek yogurt"], [{"food": "yogurt", "weight": 1.0}]),
        (["yogurt bowl"], [{"food": "yogurt", "weight": 1.0}]),
        (["yoghurt"], [{"food": "yogurt", "weight": 1.0}]),
        (["steak", "potato"], [{"food": "beef", "weight": 0.60}, {"food": "potato", "weight": 0.40}]),
        (["dal", "rice"], [{"food": "lentils", "weight": 0.45}, {"food": "rice", "weight": 0.55}]),
        (["milk", "oats"], [{"food": "milk", "weight": 0.40}, {"food": "oats", "weight": 0.60}]),
        (["egg", "toast"], [{"food": "egg", "weight": 0.40}, {"food": "white bread", "weight": 0.60}]),
        (["rice", "chicken"], [{"food": "rice", "weight": 0.65}, {"food": "chicken", "weight": 0.35}]),
    ]

    for keywords, components in keyword_rules:
        if all(keyword in normalized for keyword in keywords):
            return components

    # Generic token fallback for mixed names not covered by explicit rules.
    token_component_map = {
        "rice": "rice",
        "potato": "potato",
        "egg": "egg",
        "eggs": "egg",
        "oats": "oats",
        "milk": "milk",
        "yogurt": "yogurt",
        "yoghurt": "yogurt",
        "dal": "lentils",
        "lentils": "lentils",
        "beans": "beans",
        "bread": "white bread",
        "toast": "white bread",
        "sandwich": "white bread",
        "burger": "white bread",
        "banana": "banana",
        "beef": "beef",
        "chicken": "chicken",
        "fish": "fish",
    }
    seen_components: list[str] = []
    for token in normalized.split():
        mapped = token_component_map.get(token)
        if mapped and mapped not in seen_components:
            seen_components.append(mapped)

    if seen_components:
        weight = 1.0 / len(seen_components)
        return [{"food": component_name, "weight": weight} for component_name in seen_components]

    return []


def decompose_food_name(food_name: str) -> list[str]:
    """
    Backward-compatible wrapper that returns only component food names.
    """
    return [component.get("food", "") for component in decompose_food_name_weighted(food_name) if component.get("food")]


if __name__ == "__main__":
    examples = [
        "chicken biryani",
        "rice and chicken",
        "greek yogurt bowl",
        "steak and potatoes",
        "dal rice",
        "milk and oats",
        "egg and toast",
    ]
    for food in examples:
        print(f"{food!r} -> {decompose_food_name_weighted(food)}")
