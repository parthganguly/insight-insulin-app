"""Unmounted router: only an isolated test app registers these endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from sqlalchemy.orm import Session

from api.meals import delete_meal
from db import get_db
from db_models import MealDB
from experimental_reference.contract import ReferencePreview, ReferenceSave
from experimental_reference.service import evaluate, save, stored_response

class ReferenceRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def validate(request):
            try:
                return await handler(request)
            except RequestValidationError as exc:
                # Never echo raw inputs (including non-JSON-finite numbers).
                raise HTTPException(422, detail={"code": "invalid_reference_request"}) from exc

        return validate


router = APIRouter(prefix="/reference-meals", route_class=ReferenceRoute)


@router.post("/preview")
def preview(draft: ReferencePreview):
    return {"persisted": False, "assessment": evaluate(draft).model_dump(mode="json")}


@router.post("")
def create(draft: ReferenceSave, db: Session = Depends(get_db)):
    return save(draft, db)


@router.get("")
def list_meals(db: Session = Depends(get_db)):
    return [stored_response(row) for row in db.query(MealDB).order_by(MealDB.created_at.desc()).all()]


@router.get("/{meal_id}")
def read(meal_id: str, db: Session = Depends(get_db)):
    row = db.get(MealDB, meal_id)
    if row is None:
        raise HTTPException(404, detail={"code": "meal_not_found"})
    return stored_response(row)


router.add_api_route("/{meal_id}", delete_meal, methods=["DELETE"], status_code=204)
