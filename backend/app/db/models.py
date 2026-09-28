import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, ForeignKey, Sequence, CheckConstraint, Index
)
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, Sequence("users_seq", start=1), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    user_type = Column(String(50), nullable=False)  # RESTAURANT, SHELTER, ADMIN
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    is_active = Column(String(1), default="Y")

    restaurant = relationship("Restaurant", back_populates="user", uselist=False, cascade="all, delete-orphan")
    shelter = relationship("Shelter", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Restaurant(Base):
    __tablename__ = "restaurants"

    restaurant_id = Column(Integer, Sequence("restaurants_seq", start=1000), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    restaurant_name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    postal_code = Column(String(20))
    phone_number = Column(String(20))
    email_contact = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    total_donations_count = Column(Integer, default=0)
    total_reward_points = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="restaurant")
    listings = relationship("Listing", back_populates="restaurant", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="restaurant")
    reward_points = relationship("RewardPoint", back_populates="restaurant", cascade="all, delete-orphan")

class Shelter(Base):
    __tablename__ = "shelters"

    shelter_id = Column(Integer, Sequence("shelters_seq", start=2000), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    shelter_name = Column(String(255), nullable=False)
    shelter_type = Column(String(100), nullable=False)  # SHELTER, COMMUNITY_CENTER, NGO
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    postal_code = Column(String(20))
    phone_number = Column(String(20))
    email_contact = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    beneficiaries_count = Column(Integer)
    operational_hours = Column(String(100))
    dietary_restrictions = Column(String(500))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="shelter")
    claims = relationship("Claim", back_populates="shelter", cascade="all, delete-orphan")

class Listing(Base):
    __tablename__ = "listings"

    listing_id = Column(Integer, Sequence("listings_seq", start=5000), primary_key=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.restaurant_id", ondelete="CASCADE"), nullable=False, index=True)
    food_name = Column(String(255), nullable=False)
    food_quantity = Column(Float, nullable=False)
    quantity_unit = Column(String(50), nullable=False)  # PORTIONS, KG, LB, LITERS
    food_description = Column(Text)
    quality_safety_note = Column(String(1000))
    dietary_info = Column(String(500))
    allergen_info = Column(String(500))
    ready_time = Column(DateTime, nullable=False)
    pickup_deadline = Column(DateTime, nullable=False, index=True)
    listing_duration_minutes = Column(Integer, nullable=False)
    status = Column(String(50), default="LISTED", nullable=False, index=True)  # LISTED, CLAIMED, PICKED_UP, EXPIRED, CANCELLED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    claimed_at = Column(DateTime)
    picked_up_at = Column(DateTime)
    created_by_ai = Column(String(1), default="N")
    ai_confidence_score = Column(Float)

    restaurant = relationship("Restaurant", back_populates="listings")
    claim = relationship("Claim", back_populates="listing", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("ListingAuditLog", back_populates="listing", cascade="all, delete-orphan")

class Claim(Base):
    __tablename__ = "claims"

    claim_id = Column(Integer, Sequence("claims_seq", start=10000), primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.listing_id", ondelete="CASCADE"), unique=True, nullable=False)
    shelter_id = Column(Integer, ForeignKey("shelters.shelter_id", ondelete="CASCADE"), nullable=False, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.restaurant_id"), nullable=False, index=True)
    claimed_at = Column(DateTime, default=datetime.datetime.utcnow)
    pickup_arranged_at = Column(DateTime)
    picked_up_at = Column(DateTime)
    claim_status = Column(String(50), default="CLAIMED", nullable=False, index=True)  # CLAIMED, PICKED_UP, CANCELLED, REVERTED
    revert_reason = Column(String(500))
    reverted_at = Column(DateTime)

    listing = relationship("Listing", back_populates="claim")
    shelter = relationship("Shelter", back_populates="claims")
    restaurant = relationship("Restaurant", back_populates="claims")
    messages = relationship("ChatMessage", back_populates="claim", cascade="all, delete-orphan")
    reward_points = relationship("RewardPoint", back_populates="claim")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    message_id = Column(Integer, Sequence("chat_messages_seq", start=50000), primary_key=True)
    claim_id = Column(Integer, ForeignKey("claims.claim_id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    sender_type = Column(String(50), nullable=False)  # RESTAURANT, SHELTER
    message_text = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    read_at = Column(DateTime)

    claim = relationship("Claim", back_populates="messages")
    sender = relationship("User")

class RewardPoint(Base):
    __tablename__ = "reward_points"

    reward_id = Column(Integer, Sequence("reward_points_seq", start=100000), primary_key=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.restaurant_id", ondelete="CASCADE"), nullable=False, index=True)
    points_earned = Column(Integer, nullable=False)
    claim_id = Column(Integer, ForeignKey("claims.claim_id"))
    transaction_type = Column(String(50), nullable=False)  # DONATION_COMPLETION, BONUS, REDEMPTION
    transaction_date = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(String(500))

    restaurant = relationship("Restaurant", back_populates="reward_points")
    claim = relationship("Claim", back_populates="reward_points")

class ListingAuditLog(Base):
    __tablename__ = "listing_audit_log"

    audit_id = Column(Integer, Sequence("audit_log_seq", start=200000), primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.listing_id", ondelete="CASCADE"), nullable=False)
    ai_input_raw = Column(Text)
    ai_output_structured = Column(Text)
    ai_model_version = Column(String(50))
    confidence_score = Column(Float)
    human_corrected = Column(String(1), default="N")
    audit_timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    listing = relationship("Listing", back_populates="audit_logs")
