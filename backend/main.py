from dotenv import load_dotenv
load_dotenv()
from datetime import datetime, timedelta
import time
import uuid

from fastapi import Depends, FastAPI, HTTPException
from services import ai_meal_extract_gpt
from models import (
    AiMealExtractRequest,
    ResponseModel,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from chronic_service import build_chronic_series_from_daily_maps
from db import create_tables, get_db
from db_models import MealDB
from api.meals import router as meals_router
from utils import save_base64_images


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

        save_base64_images(data.images, folder="images")

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
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metrics/chronic")
async def get_chronic_metrics(days: int = 30, db: Session = Depends(get_db)):
    if days <= 0:
        raise HTTPException(status_code=400, detail="days must be greater than 0")

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

    for meal in meals:
        day_key = meal.created_at.date().isoformat()
        if day_key in daily_totals:
            daily_totals[day_key] += meal.insulin_load_total or 0.0
            daily_energy[day_key] += meal.total_kcal or 0.0

    chronic_series = build_chronic_series_from_daily_maps(daily_totals=daily_totals, daily_energy=daily_energy)

    return {
        "days": days,
        "series": chronic_series,
        "current_daily_dil": chronic_series[-1]["daily_dil"] if chronic_series else 0.0,
        "current_daily_dii": chronic_series[-1]["daily_dii"] if chronic_series else 0.0,
        "current_rolling_7d_dil": chronic_series[-1]["rolling_7d_dil"] if chronic_series else 0.0,
        "current_rolling_7d_dii": chronic_series[-1]["rolling_7d_dii"] if chronic_series else 0.0,
    }
