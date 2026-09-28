from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Restaurant, RewardPoint
from app.auth.jwt import get_current_user
from app.schemas.schemas import RewardsSummaryResponse, RewardTransaction

router = APIRouter(prefix="/api/v1", tags=["Rewards"])

@router.get("/restaurants/{restaurant_id}/rewards", response_model=RewardsSummaryResponse)
def get_restaurant_rewards(
    restaurant_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).filter(Restaurant.restaurant_id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")

    rewards = (
        db.query(RewardPoint)
        .filter(RewardPoint.restaurant_id == restaurant_id)
        .order_by(RewardPoint.transaction_date.desc())
        .all()
    )

    from_donations = sum(r.points_earned for r in rewards if r.transaction_type == "DONATION_COMPLETION")
    from_bonuses = sum(r.points_earned for r in rewards if r.transaction_type == "BONUS")
    redeemed = sum(abs(r.points_earned) for r in rewards if r.transaction_type == "REDEMPTION")

    transactions = [
        RewardTransaction(
            reward_id=r.reward_id,
            points_earned=r.points_earned,
            transaction_type=r.transaction_type,
            claim_id=r.claim_id,
            transaction_date=r.transaction_date,
            notes=r.notes
        )
        for r in rewards[:20]
    ]

    return RewardsSummaryResponse(
        restaurant_id=restaurant.restaurant_id,
        total_reward_points=restaurant.total_reward_points or 0,
        donations_completed=restaurant.total_donations_count or 0,
        points_breakdown={
            "from_donations": from_donations,
            "from_bonuses": from_bonuses,
            "redeemed": redeemed
        },
        recent_transactions=transactions
    )
