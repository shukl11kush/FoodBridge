from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Listing, Restaurant, Shelter, ListingAuditLog
from app.auth.jwt import get_current_user, get_current_restaurant, get_current_shelter
from app.services.ai_listing_service import parse_listing_with_ai
from app.services.matching_service import find_matched_listings
from app.schemas.schemas import (
    ManualListingCreate, AIAssistRequest, ListingResponse, ListingListResponse,
    ListingCancelRequest, ListingCancelResponse, SearchMatchesRequest, SearchMatchesResponse
)

router = APIRouter(prefix="/api/v1/listings", tags=["Listings"])

@router.post("/manual", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def create_manual_listing(
    req: ManualListingCreate,
    restaurant: Restaurant = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    if req.pickup_deadline <= req.ready_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="pickup_deadline must be after ready_time"
        )

    duration = req.listing_duration_minutes
    if not duration:
        duration = int((req.pickup_deadline - req.ready_time).total_seconds() / 60)

    listing = Listing(
        restaurant_id=restaurant.restaurant_id,
        food_name=req.food_name,
        food_quantity=req.food_quantity,
        quantity_unit=req.quantity_unit,
        food_description=req.food_description,
        quality_safety_note=req.quality_safety_note,
        dietary_info=req.dietary_info,
        allergen_info=req.allergen_info,
        ready_time=req.ready_time,
        pickup_deadline=req.pickup_deadline,
        listing_duration_minutes=duration,
        status="LISTED",
        created_by_ai="N"
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)

    return ListingResponse(
        listing_id=listing.listing_id,
        restaurant_id=listing.restaurant_id,
        food_name=listing.food_name,
        food_quantity=listing.food_quantity,
        quantity_unit=listing.quantity_unit,
        food_description=listing.food_description,
        quality_safety_note=listing.quality_safety_note,
        dietary_info=listing.dietary_info,
        allergen_info=listing.allergen_info,
        ready_time=listing.ready_time,
        pickup_deadline=listing.pickup_deadline,
        listing_duration_minutes=listing.listing_duration_minutes,
        status=listing.status,
        created_at=listing.created_at,
        created_by_ai=False,
        restaurant_name=restaurant.restaurant_name
    )

@router.post("/ai-assist", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def create_ai_assisted_listing(
    req: AIAssistRequest,
    restaurant: Restaurant = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    parsed = parse_listing_with_ai(req.raw_input, db)
    confidence = parsed.get("confidence_score", 0.0)

    if confidence < 0.75:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse input with sufficient confidence (score: {confidence:.2f}). Please use manual listing form for accurate details."
        )

    now = datetime.utcnow()
    offset_mins = parsed.get("ready_time_offset_minutes", 0)
    dur_mins = parsed.get("availability_duration_minutes", 180)
    ready_time = now + timedelta(minutes=offset_mins)
    pickup_deadline = ready_time + timedelta(minutes=dur_mins)

    listing = Listing(
        restaurant_id=restaurant.restaurant_id,
        food_name=parsed.get("food_name", "Donated Food"),
        food_quantity=float(parsed.get("food_quantity", 10)),
        quantity_unit=parsed.get("quantity_unit", "PORTIONS"),
        food_description=parsed.get("food_description", req.raw_input),
        dietary_info=parsed.get("dietary_info"),
        allergen_info=parsed.get("allergen_info"),
        ready_time=ready_time,
        pickup_deadline=pickup_deadline,
        listing_duration_minutes=dur_mins,
        status="LISTED",
        created_by_ai="Y",
        ai_confidence_score=confidence
    )
    db.add(listing)
    db.flush()

    # Log audit log
    audit = ListingAuditLog(
        listing_id=listing.listing_id,
        ai_input_raw=req.raw_input,
        ai_output_structured=str(parsed),
        ai_model_version="heuristic-1.0",
        confidence_score=confidence
    )
    db.add(audit)
    db.commit()
    db.refresh(listing)

    return ListingResponse(
        listing_id=listing.listing_id,
        restaurant_id=listing.restaurant_id,
        food_name=listing.food_name,
        food_quantity=listing.food_quantity,
        quantity_unit=listing.quantity_unit,
        food_description=listing.food_description,
        quality_safety_note=listing.quality_safety_note,
        dietary_info=listing.dietary_info,
        allergen_info=listing.allergen_info,
        ready_time=listing.ready_time,
        pickup_deadline=listing.pickup_deadline,
        listing_duration_minutes=listing.listing_duration_minutes,
        status=listing.status,
        created_at=listing.created_at,
        created_by_ai=True,
        ai_confidence_score=confidence,
        restaurant_name=restaurant.restaurant_name
    )

@router.get("/my-listings", response_model=ListingListResponse)
def get_my_listings(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = 10,
    offset: int = 0,
    restaurant: Restaurant = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    query = db.query(Listing).filter(Listing.restaurant_id == restaurant.restaurant_id)
    if status_filter:
        query = query.filter(Listing.status == status_filter.upper())

    total = query.count()
    listings = query.order_by(Listing.created_at.desc()).offset(offset).limit(limit).all()

    # Calculate status counts
    all_listings = db.query(Listing).filter(Listing.restaurant_id == restaurant.restaurant_id).all()
    statuses_count = {"LISTED": 0, "CLAIMED": 0, "PICKED_UP": 0, "EXPIRED": 0, "CANCELLED": 0}
    for l in all_listings:
        statuses_count[l.status] = statuses_count.get(l.status, 0) + 1

    items = [
        ListingResponse(
            listing_id=l.listing_id,
            restaurant_id=l.restaurant_id,
            food_name=l.food_name,
            food_quantity=l.food_quantity,
            quantity_unit=l.quantity_unit,
            food_description=l.food_description,
            quality_safety_note=l.quality_safety_note,
            dietary_info=l.dietary_info,
            allergen_info=l.allergen_info,
            ready_time=l.ready_time,
            pickup_deadline=l.pickup_deadline,
            listing_duration_minutes=l.listing_duration_minutes,
            status=l.status,
            created_at=l.created_at,
            claimed_at=l.claimed_at,
            picked_up_at=l.picked_up_at,
            created_by_ai=(l.created_by_ai == "Y"),
            ai_confidence_score=l.ai_confidence_score,
            restaurant_name=restaurant.restaurant_name
        )
        for l in listings
    ]

    return ListingListResponse(listings=items, total=total, statuses_count=statuses_count)

@router.get("/available", response_model=ListingListResponse)
def get_available_listings(
    city: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Listing, Restaurant).join(Restaurant, Listing.restaurant_id == Restaurant.restaurant_id).filter(Listing.status == "LISTED")
    if city:
        query = query.filter(Restaurant.city.ilike(f"%{city}%"))

    total = query.count()
    results = query.order_by(Listing.created_at.desc()).offset(offset).limit(limit).all()

    items = [
        ListingResponse(
            listing_id=l.listing_id,
            restaurant_id=l.restaurant_id,
            food_name=l.food_name,
            food_quantity=l.food_quantity,
            quantity_unit=l.quantity_unit,
            food_description=l.food_description,
            quality_safety_note=l.quality_safety_note,
            dietary_info=l.dietary_info,
            allergen_info=l.allergen_info,
            ready_time=l.ready_time,
            pickup_deadline=l.pickup_deadline,
            listing_duration_minutes=l.listing_duration_minutes,
            status=l.status,
            created_at=l.created_at,
            created_by_ai=(l.created_by_ai == "Y"),
            restaurant_name=r.restaurant_name
        )
        for l, r in results
    ]

    return ListingListResponse(listings=items, total=total)

@router.post("/search-matches", response_model=SearchMatchesResponse)
def search_matched_listings(
    req: SearchMatchesRequest,
    shelter: Shelter = Depends(get_current_shelter),
    db: Session = Depends(get_db)
):
    results = find_matched_listings(shelter, req, db)
    return SearchMatchesResponse(results=results)

@router.put("/{listing_id}/cancel", response_model=ListingCancelResponse)
def cancel_listing(
    listing_id: int,
    req: ListingCancelRequest,
    restaurant: Restaurant = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    listing = db.query(Listing).filter(Listing.listing_id == listing_id, Listing.restaurant_id == restaurant.restaurant_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    listing.status = "CANCELLED"
    db.commit()

    return ListingCancelResponse(
        listing_id=listing.listing_id,
        status="CANCELLED",
        cancelled_at=datetime.utcnow()
    )
