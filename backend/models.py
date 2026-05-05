from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class AiMealExtractRequest(BaseModel):
    images: List[str]
    textualData: str  # Optional, can be used for additional context


class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[Any]


class Unit(str, Enum):
    Grams = "g"
    Milliliters = "ml"
    Pieces = "pcs"
    Slices = "slice"
    Cups = "cup"
    Tablespoons = "tbsp"
    Servings = "serving"


class MealItem(BaseModel):
    id: Optional[str] = None
    name: str
    fii: int
    quantity: float
    unit: Unit
    kcalPerUnit: float

    carb_g: float
    gi: int
    satFat_g: float


class Meal(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    created_at: Optional[datetime] = None
    meal_name: str
    totals: Optional[dict[str, Optional[float]]] = None
    acute_score: float
    chronic_score: Optional[float] = None
    items: List[MealItem]


class MealItemCreate(BaseModel):
    name: str
    quantity: float
    unit: Unit
    kcalPerUnit: Optional[float] = None
    carb_g: Optional[float] = None
    protein_g: Optional[float] = None
    fat_g: Optional[float] = None
    satFat_g: Optional[float] = None
    gi: Optional[int] = None
    fii_value: Optional[int] = None
    fii: Optional[int] = None


class MealCreate(BaseModel):
    meal_name: str
    created_at: Optional[datetime] = None
    items: List[MealItemCreate]


class MealItemResponse(MealItemCreate):
    kcal_item: float
    insulin_load: float
    confidence: float = Field(ge=0.0, le=1.0)
    fii_source: str
    why: str


class MealResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    meal_name: str
    items: List[MealItemResponse]
    insulin_load_total: float
    acute_score: float
    kcal_total: float
    carbs_total: float
    protein_total: float
    fat_total: float
    estimate_quality: str
    main_insulin_drivers: list[str]


class MealEstimate(BaseModel):
    estimated_calories: float
    estimated_carbs_g: float
    estimated_fat_g: float
    confidence: float = Field(ge=0.0, le=1.0)
    serving_type: str = "plate"
    serving_count: float = 1.0


class ExtractedMealItem(BaseModel):
    name: str
    fii: int
    quantity: float
    unit: Unit
    kcalPerUnit: float
    carb_g: float
    gi: int
    satFat_g: float


class ExtractedMeal(BaseModel):
    name: str
    items: List[ExtractedMealItem]
    estimate: Optional[MealEstimate] = None
