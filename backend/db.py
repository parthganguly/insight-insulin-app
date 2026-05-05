from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from db_models import Base

DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_sqlite_columns()


def _migrate_sqlite_columns() -> None:
    # Lightweight column migration for local SQLite without Alembic.
    table_columns = {
        "meals": {
            "insulin_load_total": "ALTER TABLE meals ADD COLUMN insulin_load_total FLOAT",
            "total_protein": "ALTER TABLE meals ADD COLUMN total_protein FLOAT",
            "total_fat": "ALTER TABLE meals ADD COLUMN total_fat FLOAT",
            "estimate_quality": "ALTER TABLE meals ADD COLUMN estimate_quality VARCHAR(32)",
            "main_insulin_drivers": "ALTER TABLE meals ADD COLUMN main_insulin_drivers TEXT",
        },
        "meal_items": {
            "protein_g": "ALTER TABLE meal_items ADD COLUMN protein_g FLOAT",
            "fat_g": "ALTER TABLE meal_items ADD COLUMN fat_g FLOAT",
            "kcal_item": "ALTER TABLE meal_items ADD COLUMN kcal_item FLOAT",
            "insulin_load": "ALTER TABLE meal_items ADD COLUMN insulin_load FLOAT",
            "confidence": "ALTER TABLE meal_items ADD COLUMN confidence FLOAT",
            "fii_source": "ALTER TABLE meal_items ADD COLUMN fii_source VARCHAR(64)",
            "why": "ALTER TABLE meal_items ADD COLUMN why VARCHAR(255)",
        },
    }

    inspector = inspect(engine)
    with engine.begin() as conn:
        for table_name, pending_columns in table_columns.items():
            existing = {col["name"] for col in inspector.get_columns(table_name)}
            for column_name, alter_sql in pending_columns.items():
                if column_name not in existing:
                    conn.execute(text(alter_sql))


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
