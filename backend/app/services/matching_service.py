from datetime import datetime
from math import radians, sin, cos, sqrt, atan2
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import Listing, Restaurant, Shelter
from app.schemas.schemas import SearchMatchesRequest, MatchedListingResponse, MatchScoreBreakdown

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in kilometers between two lat/lon coordinates."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 2.0  # Default fallback distance of 2km if coordinates omitted
    R = 6371.0  # Earth radius in kilometers
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2.0) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2.0) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return round(R * c, 2)

def calculate_match_scores(
    listing: Listing,
    restaurant: Restaurant,
    shelter: Shelter,
    query: SearchMatchesRequest
) -> Dict[str, Any]:
    # 1. Quantity Match Score (Q_score)
    needed = query.quantity_needed if query.quantity_needed > 0 else 1.0
    if listing.food_quantity >= needed:
        q_score = 1.0
    elif listing.food_quantity >= (0.7 * needed):
        q_score = listing.food_quantity / needed
    else:
        q_score = 0.0

    # 2. Time Fit Score (T_score)
    now = datetime.utcnow()
    time_to_pickup = max(0.0, (listing.pickup_deadline - now).total_seconds() / 60.0)
    max_wait = float(query.max_wait_time_minutes) if query.max_wait_time_minutes > 0 else 60.0

    if time_to_pickup >= max_wait:
        t_score = 1.0
    elif time_to_pickup >= (max_wait * 0.5):
        t_score = time_to_pickup / max_wait
    else:
        t_score = 0.0

    # 3. Distance Score (D_score)
    dist_km = haversine_distance(shelter.latitude, shelter.longitude, restaurant.latitude, restaurant.longitude)
    max_dist = float(query.max_distance_km) if query.max_distance_km > 0 else 10.0

    if dist_km <= max_dist:
        d_score = 1.0 - (dist_km / max_dist)
    else:
        d_score = 0.0

    # 4. Dietary Compatibility Score (Diet_score)
    diet_score = 1.0
    if query.food_preferences:
        pref_matched = False
        listing_diet = (listing.dietary_info or "").upper()
        for pref in query.food_preferences:
            if pref.upper() in listing_diet or listing_diet in pref.upper():
                pref_matched = True
                break
        diet_score = 1.0 if pref_matched else 0.5

    # 5. Allergen Safety Score (Allergen_score)
    allergen_score = 1.0
    if query.allergen_exclusions:
        listing_allergen = (listing.allergen_info or "").upper()
        for excl in query.allergen_exclusions:
            if excl.upper() in listing_allergen:
                allergen_score = 0.0
                break

    # 6. Final M_score
    m_score = (q_score * 0.3) + (t_score * 0.25) + (d_score * 0.25) + (diet_score * 0.15) + (allergen_score * 0.05)
    m_score = round(min(1.0, max(0.0, m_score)), 4)

    return {
        "m_score": m_score,
        "dist_km": dist_km,
        "breakdown": {
            "quantity_score": round(q_score, 2),
            "time_score": round(t_score, 2),
            "distance_score": round(d_score, 2),
            "dietary_score": round(diet_score, 2),
            "allergen_score": round(allergen_score, 2)
        }
    }

def find_matched_listings(
    shelter: Shelter,
    query: SearchMatchesRequest,
    db: Session
) -> List[MatchedListingResponse]:
    active_listings = (
        db.query(Listing, Restaurant)
        .join(Restaurant, Listing.restaurant_id == Restaurant.restaurant_id)
        .filter(Listing.status == "LISTED")
        .all()
    )

    results = []
    for listing, restaurant in active_listings:
        score_data = calculate_match_scores(listing, restaurant, shelter, query)
        
        # Filtering rules
        if score_data["breakdown"]["allergen_score"] == 0.0:
            continue
        if score_data["breakdown"]["quantity_score"] == 0.0:
            continue

        item = MatchedListingResponse(
            listing_id=listing.listing_id,
            restaurant_id=restaurant.restaurant_id,
            restaurant_name=restaurant.restaurant_name,
            food_name=listing.food_name,
            food_quantity=listing.food_quantity,
            quantity_unit=listing.quantity_unit,
            pickup_deadline=listing.pickup_deadline,
            ready_time=listing.ready_time,
            distance_km=score_data["dist_km"],
            match_score=score_data["m_score"],
            score_breakdown=MatchScoreBreakdown(**score_data["breakdown"]),
            status=listing.status,
            dietary_info=listing.dietary_info,
            allergen_info=listing.allergen_info,
        )
        results.append(item)

    # Sort descending by match_score
    results.sort(key=lambda x: x.match_score, reverse=True)
    return results[:20]
