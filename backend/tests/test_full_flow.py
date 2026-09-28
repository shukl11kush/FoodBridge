import os
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import Base, get_db
from app.db.models import Claim, Listing, User, Restaurant, Shelter

# Setup Test Database (file-based SQLite for multi-connection thread safety)
TEST_DB_FILE = "./test_foodbridge.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_full_platform_end_to_end_flow():
    # 1. Register Restaurant
    rest_reg = client.post("/api/v1/auth/register", json={
        "email": "tasteofindia@restaurant.com",
        "password": "SecurePassword123!",
        "user_type": "RESTAURANT",
        "restaurant_name": "Taste of India",
        "address": "123 Main St",
        "city": "Kanpur",
        "postal_code": "208001",
        "phone_number": "+919876543210"
    })
    assert rest_reg.status_code == 201
    rest_data = rest_reg.json()
    rest_token = rest_data["access_token"]
    restaurant_id = rest_data["restaurant_id"]
    assert restaurant_id is not None

    # 2. Register Shelter
    shelter_reg = client.post("/api/v1/auth/register", json={
        "email": "hope@shelter.org",
        "password": "SecurePassword123!",
        "user_type": "SHELTER",
        "shelter_name": "Hope NGO Shelter",
        "shelter_type": "NGO",
        "address": "456 Park Ave",
        "city": "Kanpur",
        "postal_code": "208002",
        "phone_number": "+919876543211",
        "beneficiaries_count": 80
    })
    assert shelter_reg.status_code == 201
    shelter_data = shelter_reg.json()
    shelter_token = shelter_data["access_token"]
    shelter_id = shelter_data["shelter_id"]

    # 3. Create Manual Listing (Restaurant)
    now = datetime.utcnow()
    ready_time = (now + timedelta(minutes=10)).isoformat()
    pickup_deadline = (now + timedelta(hours=3)).isoformat()

    listing_resp = client.post(
        "/api/v1/listings/manual",
        headers={"Authorization": f"Bearer {rest_token}"},
        json={
            "food_name": "Vegetable Biryani",
            "food_quantity": 50,
            "quantity_unit": "PORTIONS",
            "food_description": "Freshly prepared vegetable biryani",
            "dietary_info": "Vegetarian",
            "allergen_info": "Contains dairy",
            "ready_time": ready_time,
            "pickup_deadline": pickup_deadline,
            "quality_safety_note": "Kept in insulated warmers"
        }
    )
    assert listing_resp.status_code == 201
    listing_id = listing_resp.json()["listing_id"]

    # 4. Create AI-Assisted Listing
    ai_listing_resp = client.post(
        "/api/v1/listings/ai-assist",
        headers={"Authorization": f"Bearer {rest_token}"},
        json={
            "raw_input": "40 portions of vegetable curry with rice ready now for 3 hours, vegetarian"
        }
    )
    assert ai_listing_resp.status_code == 201
    ai_data = ai_listing_resp.json()
    assert ai_data["created_by_ai"] is True
    assert ai_data["ai_confidence_score"] >= 0.75

    # 5. Search Matches (Shelter Matchmaker Engine)
    search_resp = client.post(
        "/api/v1/listings/search-matches",
        headers={"Authorization": f"Bearer {shelter_token}"},
        json={
            "quantity_needed": 40,
            "quantity_unit": "PORTIONS",
            "food_preferences": ["VEGETARIAN"],
            "allergen_exclusions": [],
            "max_distance_km": 10.0,
            "max_wait_time_minutes": 120
        }
    )
    assert search_resp.status_code == 200
    matches = search_resp.json()["results"]
    assert len(matches) >= 2
    assert matches[0]["match_score"] >= 0.75

    # 6. Claim Listing (Shelter)
    claim_resp = client.post(
        f"/api/v1/listings/{listing_id}/claim",
        headers={"Authorization": f"Bearer {shelter_token}"},
        json={"shelter_id": shelter_id}
    )
    assert claim_resp.status_code == 201
    claim_id = claim_resp.json()["claim_id"]

    # Test Duplicate Claim Conflict
    dup_claim = client.post(
        f"/api/v1/listings/{listing_id}/claim",
        headers={"Authorization": f"Bearer {shelter_token}"},
        json={"shelter_id": shelter_id}
    )
    assert dup_claim.status_code == 409

    # 7. Real-Time Chat Message Exchange
    chat_send = client.post(
        f"/api/v1/chats/{claim_id}/messages",
        headers={"Authorization": f"Bearer {shelter_token}"},
        json={"message_text": "We will arrange volunteer pickup at 7:00 PM."}
    )
    assert chat_send.status_code == 201

    chat_hist = client.get(
        f"/api/v1/chats/{claim_id}/messages",
        headers={"Authorization": f"Bearer {rest_token}"}
    )
    assert chat_hist.status_code == 200
    assert len(chat_hist.json()["messages"]) == 1

    # 8. Mark Pickup Complete & Award Reward Points
    pickup_resp = client.put(
        f"/api/v1/claims/{claim_id}/pickup",
        headers={"Authorization": f"Bearer {shelter_token}"},
        json={"notes": "Food received in great condition"}
    )
    assert pickup_resp.status_code == 200
    pickup_data = pickup_resp.json()
    assert pickup_data["restaurant_reward_points_earned"] > 0

    # 9. Verify Rewards Endpoint
    rewards_resp = client.get(
        f"/api/v1/restaurants/{restaurant_id}/rewards",
        headers={"Authorization": f"Bearer {rest_token}"}
    )
    assert rewards_resp.status_code == 200
    assert rewards_resp.json()["total_reward_points"] == pickup_data["restaurant_total_points"]

def test_claim_auto_reversion_logic():
    db = TestingSessionLocal()
    # Create user, restaurant, shelter, listing
    u1 = User(email="r@r.com", password_hash="hash", user_type="RESTAURANT")
    u2 = User(email="s@s.com", password_hash="hash", user_type="SHELTER")
    db.add_all([u1, u2])
    db.flush()

    r = Restaurant(user_id=u1.user_id, restaurant_name="Resto", address="A", city="C")
    s = Shelter(user_id=u2.user_id, shelter_name="Shelter", shelter_type="NGO", address="A", city="C")
    db.add_all([r, s])
    db.flush()

    l = Listing(
        restaurant_id=r.restaurant_id,
        food_name="Old Biryani",
        food_quantity=30,
        quantity_unit="PORTIONS",
        ready_time=datetime.utcnow() - timedelta(hours=4),
        pickup_deadline=datetime.utcnow() + timedelta(hours=1),
        listing_duration_minutes=300,
        status="CLAIMED"
    )
    db.add(l)
    db.flush()

    # Claim created 3 hours ago (exceeding 2.5 hour cutoff)
    c = Claim(
        listing_id=l.listing_id,
        shelter_id=s.shelter_id,
        restaurant_id=r.restaurant_id,
        claimed_at=datetime.utcnow() - timedelta(hours=3),
        claim_status="CLAIMED"
    )
    db.add(c)
    db.commit()

    # Create admin user for trigger endpoint
    admin_u = User(email="admin@foodbridge.com", password_hash="hash", user_type="ADMIN")
    db.add(admin_u)
    db.commit()

    # Login admin & trigger revert job
    from app.auth.jwt import create_access_token
    admin_token = create_access_token({"user_id": admin_u.user_id, "user_type": "ADMIN"})

    trigger_resp = client.post(
        "/api/v1/admin/trigger-revert-job",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert trigger_resp.status_code == 200
    assert trigger_resp.json()["reverted_claims"] == 1

    db.refresh(c)
    db.refresh(l)
    assert c.claim_status == "REVERTED"
    assert l.status == "LISTED"
    db.close()
