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
            "reference_result_json": "ALTER TABLE meals ADD COLUMN reference_result_json TEXT",
            "formula_version": "ALTER TABLE meals ADD COLUMN formula_version VARCHAR(64)",
            "dataset_version": "ALTER TABLE meals ADD COLUMN dataset_version VARCHAR(96)",
            "insulin_load_total": "ALTER TABLE meals ADD COLUMN insulin_load_total FLOAT",
            "total_protein": "ALTER TABLE meals ADD COLUMN total_protein FLOAT",
            "total_fat": "ALTER TABLE meals ADD COLUMN total_fat FLOAT",
            "estimate_quality": "ALTER TABLE meals ADD COLUMN estimate_quality VARCHAR(32)",
            "main_insulin_drivers": "ALTER TABLE meals ADD COLUMN main_insulin_drivers TEXT",
            "client_request_id": "ALTER TABLE meals ADD COLUMN client_request_id VARCHAR(36)",
            "client_request_fingerprint": "ALTER TABLE meals ADD COLUMN client_request_fingerprint VARCHAR(64)",
        },
        "meal_items": {
            "item_position": "ALTER TABLE meal_items ADD COLUMN item_position INTEGER",
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

        meal_indexes = {index["name"] for index in inspect(conn).get_indexes("meals")}
        if "ux_meals_client_request_id" not in meal_indexes:
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_meals_client_request_id "
                    "ON meals(client_request_id)"
                )
            )


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
