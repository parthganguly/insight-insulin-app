import os
from typing import List

from dotenv import load_dotenv
from fastapi import HTTPException
from openai import APIConnectionError, APIStatusError, AuthenticationError, BadRequestError, OpenAI, RateLimitError

from models import ExtractedMeal

load_dotenv()


def get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    return OpenAI(api_key=api_key)


def _get_openai_error_message(exc: Exception) -> str:
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        message = body.get("message")
        if isinstance(message, str) and message.strip():
            return message

        error = body.get("error")
        if isinstance(error, dict):
            message = error.get("message")
            if isinstance(message, str) and message.strip():
                return message

    message = str(exc).strip()
    return message or "OpenAI request failed"


def ai_meal_extract_gpt(images: List[str], textual_data: str = "") -> ExtractedMeal:
    try:
        prompt = """
        You are a nutritionist assistant. Analyze the image of the food and extract:
        1. The overall meal name
        2. A **meal-level estimate** (top-down estimate for the whole dish)
        3. A list of food ingredients as supporting detail

        ## Meal-level estimate

        Provide a single top-down nutritional estimate for the **entire dish as shown**.
        This must be your best holistic estimate of the whole meal, NOT a sum of the ingredient breakdown.
        Think: "How many calories does a typical plate of this dish contain?"

        Return the estimate object with:
        - **estimated_calories**: total kcal for the whole dish (float)
        - **estimated_carbs_g**: total carbohydrates in grams (float)
        - **estimated_fat_g**: total fat in grams (float)
        - **confidence**: your confidence in the estimate from 0.0 to 1.0 (float)
        - **serving_type**: what the portion looks like (e.g. "plate", "bowl", "piece", "cup")
        - **serving_count**: how many servings are shown (float, default 1.0)

        ## Ingredient breakdown

        For each food ingredient, return the following information as a structured JSON object:

        - **name**: the name of the ingredient (string)
        - **fii**: estimated Food Insulin Index (integer from 0 to 100)
        - **unit**: unit of measurement (one of: "g", "ml", "pcs", "slice", "cup", "tbsp", "serving")
        - **kcalPerUnit**: estimated number of kilocalories for **one unit only**, **not** the total for the whole portion (e.g., 1 slice of bread = 80 kcal, not 160 kcal for 2 slices)
        - **quantity**: how many units were present in the meal (e.g., 2.5 slices, 100g, 1.25 cups)
        - **carb_g**: estimated grams of carbohydrates in the ingredient (integer)
        - **gi**: estimated glycemic index (integer from 0 to 100)
        - **satFat_g**: estimated grams of saturated fat in the ingredient (integer)

        ⚠️ Important:
        - The meal-level `estimated_calories` must be a top-down estimate of the whole dish, NOT a sum of ingredient items.
        - Do **not multiply** kcalPerUnit by quantity — only return kcalPerUnit as the value for **a single unit**.
        - The `quantity` field tells how many units were consumed.
        - If the unit is `g`, then kcalPerUnit and macro grams must be for **1 gram**, not per 100g.
        - If the unit is `ml`, then kcalPerUnit and macro grams must be for **1 milliliter**, not per 100ml.
        - We will calculate total kcal programmatically using: `totalKcal = quantity × kcalPerUnit`
        - If images of a nutritional label are provided, use that information as a single item instead of creating multiple items for each ingredient.
        - Make sure to understand the nutitional label correctly. Note the serving size mentioned on the label, note the percentage of the nutional value, and calculate the values accordingly based on how much of the food was consumed.

        Return the meal name, estimate object, and the array of items in valid JSON format, no text explanation.

        """

        content = [{"type": "input_text", "text": prompt}]

        content += [{"type": "input_image", "image_url": image}
                    for image in images]

        if textual_data:
            content.append({"type": "input_text", "text": textual_data})

        client = get_openai_client()
        response = client.responses.parse(
            model="gpt-4.1",
            input=[{
                "role": "user",
                "content": content,
            }],  # type: ignore
            text_format=ExtractedMeal
        )

        parsed_meal = response.output_parsed

        if not parsed_meal:
            raise HTTPException(
                status_code=400, detail="Invalid meal data received")

        return parsed_meal

    except HTTPException:
        raise
    except ValueError:
        raise
    except BadRequestError as e:
        raise HTTPException(status_code=400, detail=_get_openai_error_message(e))
    except AuthenticationError as e:
        raise HTTPException(status_code=502, detail=_get_openai_error_message(e))
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail=_get_openai_error_message(e))
    except APIConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Unable to reach OpenAI. Check network access and try again.",
        )
    except APIStatusError as e:
        raise HTTPException(
            status_code=e.status_code or 502,
            detail=_get_openai_error_message(e),
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
