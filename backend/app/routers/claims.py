from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Listing, Claim, Shelter, Restaurant, User
from app.auth.jwt import get_current_user, get_current_shelter
from app.services.reward_service import award_pickup_rewards
from app.schemas.schemas import ClaimCreateRequest, ClaimResponse, PickupRequest, PickupResponse

router = APIRouter(prefix="/api/v1", tags=["Claims"])

@router.post("/listings/{listing_id}/claim", response_model=ClaimResponse, status_code=status.HTTP_201_CREATED)
def claim_listing(
    listing_id: int,
    req: ClaimCreateRequest,
    shelter: Shelter = Depends(get_current_shelter),
    db: Session = Depends(get_db)
):
    listing = db.query(Listing).filter(Listing.listing_id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    if listing.status != "LISTED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Listing already claimed by another shelter"
        )

    # Update Listing status
    now = datetime.utcnow()
    listing.status = "CLAIMED"
    listing.claimed_at = now

    # Create Claim
    claim = Claim(
        listing_id=listing.listing_id,
        shelter_id=shelter.shelter_id,
        restaurant_id=listing.restaurant_id,
        claimed_at=now,
        claim_status="CLAIMED"
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)

    time_remaining = max(0, int((listing.pickup_deadline - now).total_seconds() / 60))
    restaurant = db.query(Restaurant).filter(Restaurant.restaurant_id == listing.restaurant_id).first()

    return ClaimResponse(
        claim_id=claim.claim_id,
        listing_id=claim.listing_id,
        shelter_id=claim.shelter_id,
        restaurant_id=claim.restaurant_id,
        claimed_at=claim.claimed_at,
        claim_status=claim.claim_status,
        time_remaining_minutes=time_remaining,
        message="Listing claimed successfully. You can now chat with the restaurant.",
        food_name=listing.food_name,
        food_quantity=listing.food_quantity,
        quantity_unit=listing.quantity_unit,
        restaurant_name=restaurant.restaurant_name if restaurant else None,
        shelter_name=shelter.shelter_name
    )

# Static route MUST come before dynamic /claims/{claim_id} parameter route!
@router.get("/claims/my-claims", response_model=List[ClaimResponse])
def get_my_claims(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Claim)
    if user.user_type == "SHELTER" and user.shelter:
        query = query.filter(Claim.shelter_id == user.shelter.shelter_id)
    elif user.user_type == "RESTAURANT" and user.restaurant:
        query = query.filter(Claim.restaurant_id == user.restaurant.restaurant_id)

    claims = query.order_by(Claim.claimed_at.desc()).all()
    now = datetime.utcnow()

    res = []
    for c in claims:
        listing = db.query(Listing).filter(Listing.listing_id == c.listing_id).first()
        restaurant = db.query(Restaurant).filter(Restaurant.restaurant_id == c.restaurant_id).first()
        shelter = db.query(Shelter).filter(Shelter.shelter_id == c.shelter_id).first()
        time_rem = max(0, int((listing.pickup_deadline - now).total_seconds() / 60)) if listing else 0

        res.append(
            ClaimResponse(
                claim_id=c.claim_id,
                listing_id=c.listing_id,
                shelter_id=c.shelter_id,
                restaurant_id=c.restaurant_id,
                claimed_at=c.claimed_at,
                pickup_arranged_at=c.pickup_arranged_at,
                picked_up_at=c.picked_up_at,
                claim_status=c.claim_status,
                time_remaining_minutes=time_rem,
                food_name=listing.food_name if listing else "Donated Food",
                food_quantity=listing.food_quantity if listing else 0,
                quantity_unit=listing.quantity_unit if listing else "PORTIONS",
                restaurant_name=restaurant.restaurant_name if restaurant else None,
                shelter_name=shelter.shelter_name if shelter else None
            )
        )
    return res

@router.get("/claims/{claim_id}", response_model=ClaimResponse)
def get_claim_details(
    claim_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    listing = db.query(Listing).filter(Listing.listing_id == claim.listing_id).first()
    restaurant = db.query(Restaurant).filter(Restaurant.restaurant_id == claim.restaurant_id).first()
    shelter = db.query(Shelter).filter(Shelter.shelter_id == claim.shelter_id).first()
    now = datetime.utcnow()
    time_remaining = max(0, int((listing.pickup_deadline - now).total_seconds() / 60)) if listing else 0

    return ClaimResponse(
        claim_id=claim.claim_id,
        listing_id=claim.listing_id,
        shelter_id=claim.shelter_id,
        restaurant_id=claim.restaurant_id,
        claimed_at=claim.claimed_at,
        pickup_arranged_at=claim.pickup_arranged_at,
        picked_up_at=claim.picked_up_at,
        claim_status=claim.claim_status,
        time_remaining_minutes=time_remaining,
        food_name=listing.food_name if listing else None,
        food_quantity=listing.food_quantity if listing else None,
        quantity_unit=listing.quantity_unit if listing else None,
        restaurant_name=restaurant.restaurant_name if restaurant else None,
        shelter_name=shelter.shelter_name if shelter else None
    )

@router.put("/claims/{claim_id}/pickup", response_model=PickupResponse)
def mark_claim_as_picked_up(
    claim_id: int,
    req: PickupRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    if claim.claim_status == "PICKED_UP":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Claim already marked as picked up"
        )

    now = req.pickup_timestamp or datetime.utcnow()
    claim.claim_status = "PICKED_UP"
    claim.picked_up_at = now

    listing = db.query(Listing).filter(Listing.listing_id == claim.listing_id).first()
    if listing:
        listing.status = "PICKED_UP"
        listing.picked_up_at = now

    db.commit()
    db.refresh(claim)

    # Award Reward Points to Restaurant
    earned = award_pickup_rewards(claim, db)

    restaurant = db.query(Restaurant).filter(Restaurant.restaurant_id == claim.restaurant_id).first()
    total_pts = restaurant.total_reward_points if restaurant else 0

    return PickupResponse(
        claim_id=claim.claim_id,
        claim_status="PICKED_UP",
        picked_up_at=claim.picked_up_at,
        restaurant_reward_points_earned=earned,
        restaurant_total_points=total_pts
    )
