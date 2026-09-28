from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Restaurant, Shelter, Listing, Claim, User, ChatMessage, RewardPoint, ListingAuditLog
from app.auth.jwt import get_current_admin
from app.services.revert_service import execute_claim_reversion_job
from app.schemas.schemas import AdminDashboardResponse, AdminDashboardMetrics, TopDonorInfo

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])

@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_restaurants = db.query(Restaurant).count()
    total_shelters = db.query(Shelter).count()
    active_listings = db.query(Listing).filter(Listing.status == "LISTED").count()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    claims_today = db.query(Claim).filter(Claim.claimed_at >= today_start).count()

    total_claims = db.query(Claim).count()
    picked_up_claims = db.query(Claim).filter(Claim.claim_status == "PICKED_UP").count()
    pickup_success_rate = round(picked_up_claims / total_claims, 2) if total_claims > 0 else 1.0

    metrics = AdminDashboardMetrics(
        total_restaurants=total_restaurants,
        total_shelters=total_shelters,
        active_listings=active_listings,
        claims_today=claims_today,
        pickup_success_rate=pickup_success_rate,
        avg_claim_fulfillment_time_minutes=45.0
    )

    all_listings = db.query(Listing).all()
    listings_by_status = {"LISTED": 0, "CLAIMED": 0, "PICKED_UP": 0, "EXPIRED": 0, "CANCELLED": 0}
    for l in all_listings:
        listings_by_status[l.status] = listings_by_status.get(l.status, 0) + 1

    top_restaurants = (
        db.query(Restaurant)
        .order_by(Restaurant.total_reward_points.desc())
        .limit(5)
        .all()
    )

    top_donors = [
        TopDonorInfo(
            restaurant_id=r.restaurant_id,
            restaurant_name=r.restaurant_name,
            total_donations=r.total_donations_count or 0,
            total_reward_points=r.total_reward_points or 0
        )
        for r in top_restaurants
    ]

    from app.schemas.schemas import AdminRestaurantInfo, AdminShelterInfo
    all_restaurants = db.query(Restaurant).all()
    restaurants_list = [
        AdminRestaurantInfo(
            restaurant_id=r.restaurant_id,
            restaurant_name=r.restaurant_name,
            city=r.city,
            address=r.address,
            phone_number=r.phone_number,
            email=r.user.email if r.user else r.email_contact,
            total_donations_count=r.total_donations_count or 0,
            total_reward_points=r.total_reward_points or 0
        )
        for r in all_restaurants
    ]

    all_shelters = db.query(Shelter).all()
    shelters_list = [
        AdminShelterInfo(
            shelter_id=s.shelter_id,
            shelter_name=s.shelter_name,
            shelter_type=s.shelter_type or "SHELTER",
            city=s.city,
            address=s.address,
            phone_number=s.phone_number,
            email=s.user.email if s.user else s.email_contact,
            beneficiaries_count=s.beneficiaries_count
        )
        for s in all_shelters
    ]

    return AdminDashboardResponse(
        metrics=metrics,
        listings_by_status=listings_by_status,
        top_donors=top_donors,
        restaurants=restaurants_list,
        shelters=shelters_list
    )

@router.post("/trigger-revert-job")
def trigger_revert_job(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    result = execute_claim_reversion_job(db)
    return result

@router.post("/reset-database")
def reset_database_data(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Purge test listings, claims, chat messages, reward points, and audit logs."""
    try:
        db.query(ChatMessage).delete()
        db.query(RewardPoint).delete()
        db.query(Claim).delete()
        db.query(ListingAuditLog).delete()
        db.query(Listing).delete()
        
        # Reset restaurant total donation counts and points
        restaurants = db.query(Restaurant).all()
        for r in restaurants:
            r.total_donations_count = 0
            r.total_reward_points = 0
            
        db.commit()
        return {"message": "System listings, claims, and reward points reset successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")
