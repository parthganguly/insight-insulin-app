from dotenv import load_dotenv
load_dotenv()
from datetime import datetime, timedelta
import math
import time
import uuid

from fastapi import Depends, FastAPI, HTTPException, Query
from services import ai_meal_extract_gpt
from models import (
    AiMealExtractRequest,
    ResponseModel,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from chronic_service import ROLLING_WINDOW_DAYS, build_chronic_series_from_daily_maps
from db import create_tables, get_db
from db_models import MealDB
from api.meals import router as meals_router


# Load environment variables from .env file

app = FastAPI()
app.include_router(meals_router)

# Allow all domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    create_tables()


@app.get("/")
async def read_root():
    return {"message": "Hello, World!"}


@app.post("/ai-meal-extract", response_model=ResponseModel)
async def extract_meal(data: AiMealExtractRequest):
    try:
        try:
            meal = ai_meal_extract_gpt(data.images, data.textualData)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        meal_id = str(uuid.uuid4())

        # Uploaded images are kept in memory only for the AI extraction call
        # and must never be written to disk by default (issue #48).
        meal_data: dict = {
            "id": meal_id,
            "name": meal.name,
            "timestamp": int(time.time() * 1000),
            "items": [item.model_dump() for item in meal.items],
        }
        if meal.estimate is not None:
            meal_data["estimate"] = meal.estimate.model_dump()

        return ResponseModel(
            success=True,
            message="Meal extracted successfully",
            data={"meal": meal_data}
        )

    except HTTPException:
        raise
    except Exception as e:
        # Diagnostics stay in the server log only (issue #93): raw exception
        # text can carry provider responses, file paths, or key fragments and
        # must never reach the HTTP response body.
        print(f"Unhandled /ai-meal-extract error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


def _finite_or_zero(value: float | None) -> float:
    """Defensive read of stored aggregates: a malformed (None/NaN/inf) row
    contributes 0 to its day instead of poisoning the whole trend."""
    if value is None:
        return 0.0
    numeric = float(value)
    return numeric if math.isfinite(numeric) else 0.0


# Bound on the chronic query window (issue #93): the UI requests 30 days and
# the rolling trend itself is 7 days, so 365 comfortably covers a full year
# of local history review while capping the per-request day loop and DB scan
# an unauthenticated caller can trigger.
MAX_CHRONIC_QUERY_DAYS = 365


@app.get("/metrics/chronic")
async def get_chronic_metrics(
    days: int = Query(default=30, ge=1, le=MAX_CHRONIC_QUERY_DAYS),
    db: Session = Depends(get_db),
):
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=days - 1)
    meals = (
        db.query(MealDB)
        .filter(MealDB.created_at >= datetime.combine(start_date, datetime.min.time()))
        .order_by(MealDB.created_at.asc())
        .all()
    )

    daily_totals: dict[str, float] = {}
    daily_energy: dict[str, float] = {}
    for offset in range(days):
        day_key = (start_date + timedelta(days=offset)).isoformat()
        daily_totals[day_key] = 0.0
        daily_energy[day_key] = 0.0

    # Days with at least one logged meal. Days outside this set are missing
    # data and are excluded from the rolling trend (issue #93), never treated
    # as zero-insulin days.
    logged_days: set[str] = set()
    for meal in meals:
        day_key = meal.created_at.date().isoformat()
        if day_key in daily_totals:
            daily_totals[day_key] += _finite_or_zero(meal.insulin_load_total)
            daily_energy[day_key] += _finite_or_zero(meal.total_kcal)
            logged_days.add(day_key)

    chronic_series = build_chronic_series_from_daily_maps(
        daily_totals=daily_totals, daily_energy=daily_energy, logged_days=logged_days
    )
    latest_point = chronic_series[-1] if chronic_series else None
    logged_days_in_window = int(latest_point["logged_days_in_window"]) if latest_point else 0

    return {
        "days": days,
        "window_days": ROLLING_WINDOW_DAYS,
        "logged_days_last_7": logged_days_in_window,
        "has_data": logged_days_in_window > 0,
        "series": chronic_series,
        # Current values are None (not 0) whenever the underlying data is
        # missing: an unlogged today for the daily values, or a window with
        # no logged days for the rolling values.
        "current_daily_dil": latest_point["daily_dil"] if latest_point else None,
        "current_daily_dii": latest_point["daily_dii"] if latest_point else None,
        "current_rolling_7d_dil": latest_point["rolling_7d_dil"] if latest_point else None,
        "current_rolling_7d_dii": latest_point["rolling_7d_dii"] if latest_point else None,
    }
