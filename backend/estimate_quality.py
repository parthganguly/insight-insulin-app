def resolve_estimate_quality(item_sources: list[str]) -> str:
    if not item_sources:
        return "unknown"
    unique_sources = set(item_sources)
    if unique_sources.issubset({"exact_fii", "user_confirmed"}):
        return "high"
    if unique_sources == {"unknown"}:
        return "unknown"
    if unique_sources.issubset({"exact_fii", "mapped_fii", "user_confirmed"}):
        return "medium"
    return "low"
