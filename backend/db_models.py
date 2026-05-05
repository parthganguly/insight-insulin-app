from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class MealDB(Base):
    __tablename__ = "meals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    meal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_kcal: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_carb: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_protein: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_fat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_sat_fat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    insulin_load_total: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    acute_score: Mapped[float] = mapped_column(Float, nullable=False)
    chronic_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    estimate_quality: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    main_insulin_drivers: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    items: Mapped[List["MealItemDB"]] = relationship(
        back_populates="meal",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class MealItemDB(Base):
    __tablename__ = "meal_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    meal_id: Mapped[str] = mapped_column(String(36), ForeignKey("meals.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    kcal_per_unit: Mapped[float] = mapped_column(Float, nullable=False)
    carb_g: Mapped[float] = mapped_column(Float, nullable=False)
    protein_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fat_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    gi: Mapped[int] = mapped_column(Integer, nullable=False)
    sat_fat_g: Mapped[float] = mapped_column(Float, nullable=False)
    fii: Mapped[int] = mapped_column(Integer, nullable=False)
    kcal_item: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    insulin_load: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fii_source: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    why: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    meal: Mapped[MealDB] = relationship(back_populates="items")
