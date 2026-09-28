from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# --- Auth Schemas ---
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    user_type: str  # RESTAURANT, SHELTER, ADMIN
    
    # Restaurant fields
    restaurant_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    phone_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Shelter fields
    shelter_name: Optional[str] = None
    shelter_type: Optional[str] = "SHELTER"  # SHELTER, COMMUNITY_CENTER, NGO
    beneficiaries_count: Optional[int] = None
    operational_hours: Optional[str] = None
    dietary_restrictions: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    user_type: str
    restaurant_id: Optional[int] = None
    shelter_id: Optional[int] = None

# --- User/Profile Schemas ---
class UserProfileResponse(BaseModel):
    user_id: int
    email: str
    user_type: str
    is_active: str
    created_at: datetime
    restaurant: Optional[Dict[str, Any]] = None
    shelter: Optional[Dict[str, Any]] = None

# --- Listing Schemas ---
class ManualListingCreate(BaseModel):
    food_name: str = Field(..., min_length=2, max_length=100)
    food_quantity: float = Field(..., gt=0)
    quantity_unit: str  # PORTIONS, KG, LB, LITERS
    food_description: Optional[str] = None
    dietary_info: Optional[str] = None
    allergen_info: Optional[str] = None
    ready_time: datetime
    pickup_deadline: datetime
    listing_duration_minutes: Optional[int] = None
    quality_safety_note: Optional[str] = None

class AIAssistRequest(BaseModel):
    raw_input: str

class ListingResponse(BaseModel):
    listing_id: int
    restaurant_id: int
    food_name: str
    food_quantity: float
    quantity_unit: str
    food_description: Optional[str] = None
    quality_safety_note: Optional[str] = None
    dietary_info: Optional[str] = None
    allergen_info: Optional[str] = None
    ready_time: datetime
    pickup_deadline: datetime
    listing_duration_minutes: int
    status: str
    created_at: datetime
    claimed_at: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    created_by_ai: bool = False
    ai_confidence_score: Optional[float] = None
    restaurant_name: Optional[str] = None

class ListingListResponse(BaseModel):
    listings: List[ListingResponse]
    total: int
    statuses_count: Optional[Dict[str, int]] = None

class ListingCancelRequest(BaseModel):
    reason: Optional[str] = "Cancelled by restaurant"

class ListingCancelResponse(BaseModel):
    listing_id: int
    status: str
    cancelled_at: datetime

# --- AI Matchmaking Schemas ---
class SearchMatchesRequest(BaseModel):
    quantity_needed: float = 1.0
    quantity_unit: str = "PORTIONS"
    food_preferences: Optional[List[str]] = []
    allergen_exclusions: Optional[List[str]] = []
    max_distance_km: float = 10.0
    max_wait_time_minutes: int = 120

class MatchScoreBreakdown(BaseModel):
    quantity_score: float
    time_score: float
    distance_score: float
    dietary_score: float
    allergen_score: float

class MatchedListingResponse(BaseModel):
    listing_id: int
    restaurant_id: int
    restaurant_name: str
    food_name: str
    food_quantity: float
    quantity_unit: str
    pickup_deadline: datetime
    ready_time: datetime
    distance_km: float
    match_score: float
    score_breakdown: MatchScoreBreakdown
    status: str
    dietary_info: Optional[str] = None
    allergen_info: Optional[str] = None

class SearchMatchesResponse(BaseModel):
    results: List[MatchedListingResponse]

# --- Claim Schemas ---
class ClaimCreateRequest(BaseModel):
    shelter_id: int

class ClaimResponse(BaseModel):
    claim_id: int
    listing_id: int
    shelter_id: int
    restaurant_id: int
    claimed_at: datetime
    claim_status: str
    pickup_arranged_at: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    time_remaining_minutes: Optional[int] = None
    message: Optional[str] = None
    food_name: Optional[str] = None
    food_quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    restaurant_name: Optional[str] = None
    shelter_name: Optional[str] = None

class PickupRequest(BaseModel):
    pickup_timestamp: Optional[datetime] = None
    notes: Optional[str] = None

class PickupResponse(BaseModel):
    claim_id: int
    claim_status: str
    picked_up_at: datetime
    restaurant_reward_points_earned: int
    restaurant_total_points: int

# --- Chat Schemas ---
class ChatMessageCreate(BaseModel):
    message_text: str

class ChatMessageResponse(BaseModel):
    message_id: int
    claim_id: int
    sender_id: int
    sender_type: str
    message_text: str
    sent_at: datetime
    read_at: Optional[datetime] = None

class ChatMessageListResponse(BaseModel):
    messages: List[ChatMessageResponse]
    total: int

# --- Rewards Schemas ---
class RewardTransaction(BaseModel):
    reward_id: int
    points_earned: int
    transaction_type: str
    claim_id: Optional[int] = None
    transaction_date: datetime
    notes: Optional[str] = None

class RewardsSummaryResponse(BaseModel):
    restaurant_id: int
    total_reward_points: int
    donations_completed: int
    points_breakdown: Dict[str, int]
    recent_transactions: List[RewardTransaction]

# --- Admin Schemas ---
class AdminDashboardMetrics(BaseModel):
    total_restaurants: int
    total_shelters: int
    active_listings: int
    claims_today: int
    pickup_success_rate: float
    avg_claim_fulfillment_time_minutes: float

class TopDonorInfo(BaseModel):
    restaurant_id: int
    restaurant_name: str
    total_donations: int
    total_reward_points: int

class AdminRestaurantInfo(BaseModel):
    restaurant_id: int
    restaurant_name: str
    city: str
    address: str
    phone_number: Optional[str] = None
    email: Optional[str] = None
    total_donations_count: int
    total_reward_points: int

class AdminShelterInfo(BaseModel):
    shelter_id: int
    shelter_name: str
    shelter_type: str
    city: str
    address: str
    phone_number: Optional[str] = None
    email: Optional[str] = None
    beneficiaries_count: Optional[int] = None

class AdminDashboardResponse(BaseModel):
    metrics: AdminDashboardMetrics
    listings_by_status: Dict[str, int]
    top_donors: List[TopDonorInfo]
    restaurants: List[AdminRestaurantInfo] = []
    shelters: List[AdminShelterInfo] = []
