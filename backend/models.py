import base64
import re
from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

# AI-extraction request bounds (issue #93). The Smart Camera UI already caps
# uploads at 5 images, so the backend enforces the same count defensively.
# Per-image size: the frontend sends full-size camera JPEGs as base64 data
# URLs with no client-side compression; typical phone JPEGs encode to a few
# MB, so 10 million characters (~7.5 MB decoded) is a generous defensive
# ceiling rather than a tight product limit. With the count cap this also
# bounds the combined payload. Only base64 image data URLs are accepted —
# that is the only shape the frontend produces and the provider expects.
MAX_AI_IMAGES = 5
MAX_AI_IMAGE_CHARS = 10_000_000
IMAGE_DATA_URL_PATTERN = re.compile(r"^data:image/(jpeg|jpg|png|webp|gif);base64,(.+)$", re.DOTALL)


class AiMealExtractRequest(BaseModel):
    images: List[str]
    textualData: str  # Optional, can be used for additional context

    @field_validator("images")
    @classmethod
    def validate_images(cls, images: List[str]) -> List[str]:
        if len(images) > MAX_AI_IMAGES:
            raise ValueError(f"A maximum of {MAX_AI_IMAGES} images is supported per request")
        for index, image in enumerate(images, start=1):
            if len(image) > MAX_AI_IMAGE_CHARS:
                raise ValueError(f"Image {index} exceeds the maximum supported size")
            match = IMAGE_DATA_URL_PATTERN.match(image)
            if match is None:
                raise ValueError(f"Image {index} must be a base64 image data URL")
            try:
                base64.b64decode(match.group(2), validate=True)
            except (ValueError, TypeError):
                raise ValueError(f"Image {index} is not valid base64 data")
        return images


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

    @field_validator("fii_value", "fii", mode="before")
    @classmethod
    def normalize_non_positive_fii(cls, value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None

        try:
            numeric_value = float(value)
        except (TypeError, ValueError):
            return value

        return None if numeric_value <= 0 else value


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
