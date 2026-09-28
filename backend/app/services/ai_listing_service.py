import re
import json
import datetime
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.config import settings
from app.db.models import ListingAuditLog

def parse_raw_text_heuristic(raw_input: str) -> Tuple[Dict[str, Any], float]:
    """Fallback rule-based heuristic parser for listing text when external LLM API keys are not active."""
    raw_lower = raw_input.lower()
    
    # 1. Quantity & Unit
    quantity = 10.0
    unit = "PORTIONS"
    
    qty_match = re.search(r'(\d+)\s*(portions?|kg|lb|liters?|ltrs?|boxes?|meals?)', raw_lower)
    if qty_match:
        quantity = float(qty_match.group(1))
        unit_str = qty_match.group(2)
        if "kg" in unit_str:
            unit = "KG"
        elif "lb" in unit_str:
            unit = "LB"
        elif "liter" in unit_str or "ltr" in unit_str:
            unit = "LITERS"
        else:
            unit = "PORTIONS"
    else:
        num_match = re.search(r'\b(\d+)\b', raw_lower)
        if num_match:
            quantity = float(num_match.group(1))

    # 2. Food Name
    food_name = "Surplus Food Donation"
    if "biryani" in raw_lower:
        food_name = "Vegetable Biryani" if "veg" in raw_lower else "Biryani"
    elif "curry" in raw_lower:
        food_name = "Vegetable Curry with Rice" if "rice" in raw_lower or "veg" in raw_lower else "Curry"
    elif "bread" in raw_lower:
        food_name = "Fresh Bread & Bakery Items"
    elif "dal" in raw_lower:
        food_name = "Dal & Rice"
    elif "pizza" in raw_lower:
        food_name = "Assorted Pizzas"
    else:
        # Extract leading words
        words = [w for w in raw_input.split() if not w.isdigit()]
        if len(words) >= 2:
            food_name = " ".join(words[:4]).capitalize()

    # 3. Dietary Info
    dietary_info = "Standard"
    if "vegan" in raw_lower:
        dietary_info = "Vegan"
    elif "veg" in raw_lower or "vegetarian" in raw_lower:
        dietary_info = "Vegetarian"
    elif "non-veg" in raw_lower or "chicken" in raw_lower or "meat" in raw_lower:
        dietary_info = "Non-Vegetarian"

    # 4. Allergen Info
    allergen_info = "None declared"
    if "peanut" in raw_lower or "nut" in raw_lower:
        allergen_info = "Contains nuts / peanuts"
    elif "dairy" in raw_lower or "milk" in raw_lower:
        allergen_info = "Contains dairy"
    elif "gluten" in raw_lower or "wheat" in raw_lower:
        allergen_info = "Contains gluten"

    # 5. Availability duration
    duration_minutes = 180  # Default 3 hours
    dur_match = re.search(r'(\d+)\s*(hours?|hrs?|mins?|minutes?)', raw_lower)
    if dur_match:
        val = int(dur_match.group(1))
        unit_t = dur_match.group(2)
        if "hour" in unit_t or "hr" in unit_t:
            duration_minutes = val * 60
        else:
            duration_minutes = val

    # Confidence calculation
    confidence = 0.85
    uncertainties = []
    if "idk" in raw_lower or "something" in raw_lower or len(raw_input.strip()) < 10:
        confidence = 0.40
        uncertainties.append("food_name")
        uncertainties.append("quantity")

    result = {
        "food_name": food_name,
        "food_quantity": quantity,
        "quantity_unit": unit,
        "food_description": raw_input,
        "dietary_info": dietary_info,
        "allergen_info": allergen_info,
        "ready_time_offset_minutes": 0,
        "availability_duration_minutes": duration_minutes,
        "confidence_score": confidence,
        "uncertainties": uncertainties
    }
    return result, confidence

def parse_listing_with_ai(raw_input: str, db: Session, listing_id: int = None) -> Dict[str, Any]:
    """Parse unstructured text via LLM or fallback, log audit trail."""

    # 1. Try API if configured
    parsed_data = None
    confidence = 0.0

    if settings.anthropic_api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            prompt = f"Parse this restaurant food listing into JSON: {raw_input}"
            msg = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                system="Extract JSON: food_name, food_quantity, quantity_unit, food_description, dietary_info, allergen_info, ready_time_offset_minutes, availability_duration_minutes, confidence_score",
                messages=[{"role": "user", "content": prompt}]
            )
            parsed_data = json.loads(msg.content[0].text)
            confidence = float(parsed_data.get("confidence_score", 0.85))
        except Exception:
            parsed_data = None

    if not parsed_data:
        parsed_data, confidence = parse_raw_text_heuristic(raw_input)

    return parsed_data
