from sqlalchemy.orm import Session
from app.db.models import Claim, Restaurant, RewardPoint, Listing

def award_pickup_rewards(claim: Claim, db: Session) -> int:
    """Award digital reward points to restaurant when claim is marked PICKED_UP."""
    # Check if reward already awarded for this claim
    existing_reward = db.query(RewardPoint).filter(RewardPoint.claim_id == claim.claim_id).first()
    if existing_reward:
        return existing_reward.points_earned

    listing = db.query(Listing).filter(Listing.listing_id == claim.listing_id).first()
    quantity = listing.food_quantity if listing else 10.0

    # Calculate points: Base 10 + 1 point per 2 units (max 100 per donation)
    base_points = 10
    bonus_points = min(90, int(quantity // 2))
    total_earned = base_points + bonus_points

    # Create reward point transaction
    reward_entry = RewardPoint(
        restaurant_id=claim.restaurant_id,
        points_earned=total_earned,
        claim_id=claim.claim_id,
        transaction_type="DONATION_COMPLETION",
        notes=f"Completed donation for listing #{claim.listing_id} ({listing.food_name if listing else 'Food'})"
    )
    db.add(reward_entry)

    # Update restaurant aggregate points & count
    restaurant = db.query(Restaurant).filter(Restaurant.restaurant_id == claim.restaurant_id).first()
    if restaurant:
        restaurant.total_reward_points = (restaurant.total_reward_points or 0) + total_earned
        restaurant.total_donations_count = (restaurant.total_donations_count or 0) + 1

    db.commit()
    db.refresh(restaurant)
    return total_earned
