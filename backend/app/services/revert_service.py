import logging
from datetime import datetime, timedelta
from typing import Dict
from sqlalchemy.orm import Session
from app.db.models import Claim, Listing

logger = logging.getLogger("foodbridge.revert")

def execute_claim_reversion_job(db: Session) -> Dict[str, int]:
    """Finds claims stuck in CLAIMED for > 2.5 hours and reverts them back to LISTED."""
    cutoff_time = datetime.utcnow() - timedelta(hours=2.5)
    
    expired_claims = (
        db.query(Claim)
        .filter(Claim.claim_status == "CLAIMED", Claim.claimed_at <= cutoff_time)
        .all()
    )
    
    reverted_count = 0
    errors_count = 0

    for claim in expired_claims:
        try:
            claim.claim_status = "REVERTED"
            claim.reverted_at = datetime.utcnow()
            claim.revert_reason = "Auto-reverted: No pickup within 2.5 hours"

            listing = db.query(Listing).filter(Listing.listing_id == claim.listing_id).first()
            if listing:
                listing.status = "LISTED"
                listing.claimed_at = None

            reverted_count += 1
        except Exception as e:
            logger.error(f"Error reverting claim {claim.claim_id}: {str(e)}")
            errors_count += 1

    db.commit()
    logger.info(f"Auto-revert job completed: {reverted_count} reverted, {errors_count} errors.")
    return {"reverted_claims": reverted_count, "errors": errors_count}
