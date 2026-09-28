from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User, Restaurant, Shelter
from app.auth.jwt import hash_password, verify_password, create_access_token, get_current_user
from app.schemas.schemas import RegisterRequest, LoginRequest, AuthResponse, UserProfileResponse

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    # 1. Check existing user
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # 2. Create User
    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        user_type=req.user_type.upper()
    )
    db.add(user)
    db.flush()

    restaurant_id = None
    shelter_id = None

    # 3. Create Restaurant or Shelter profile
    if req.user_type.upper() == "RESTAURANT":
        rest = Restaurant(
            user_id=user.user_id,
            restaurant_name=req.restaurant_name or "Restaurant Partner",
            address=req.address or "Address Pending",
            city=req.city or "Kanpur",
            postal_code=req.postal_code,
            phone_number=req.phone_number,
            latitude=req.latitude or 26.4499,
            longitude=req.longitude or 80.3319
        )
        db.add(rest)
        db.flush()
        restaurant_id = rest.restaurant_id

    elif req.user_type.upper() == "SHELTER":
        shelter = Shelter(
            user_id=user.user_id,
            shelter_name=req.shelter_name or "Community Shelter",
            shelter_type=req.shelter_type or "SHELTER",
            address=req.address or "Address Pending",
            city=req.city or "Kanpur",
            postal_code=req.postal_code,
            phone_number=req.phone_number,
            latitude=req.latitude or 26.4500,
            longitude=req.longitude or 80.3320,
            beneficiaries_count=req.beneficiaries_count or 50,
            dietary_restrictions=req.dietary_restrictions
        )
        db.add(shelter)
        db.flush()
        shelter_id = shelter.shelter_id

    db.commit()
    db.refresh(user)

    access_token = create_access_token({"user_id": user.user_id, "user_type": user.user_type})

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.user_id,
        user_type=user.user_type,
        restaurant_id=restaurant_id,
        shelter_id=shelter_id
    )

@router.post("/login", response_model=AuthResponse)
def login_user(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    restaurant_id = None
    shelter_id = None
    if user.user_type == "RESTAURANT" and user.restaurant:
        restaurant_id = user.restaurant.restaurant_id
    elif user.user_type == "SHELTER" and user.shelter:
        shelter_id = user.shelter.shelter_id

    access_token = create_access_token({"user_id": user.user_id, "user_type": user.user_type})

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.user_id,
        user_type=user.user_type,
        restaurant_id=restaurant_id,
        shelter_id=shelter_id
    )

@router.get("/profile", response_model=UserProfileResponse)
def get_user_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rest_dict = None
    shelter_dict = None
    if user.restaurant:
        rest_dict = {
            "restaurant_id": user.restaurant.restaurant_id,
            "restaurant_name": user.restaurant.restaurant_name,
            "city": user.restaurant.city,
            "total_donations_count": user.restaurant.total_donations_count,
            "total_reward_points": user.restaurant.total_reward_points
        }
    if user.shelter:
        shelter_dict = {
            "shelter_id": user.shelter.shelter_id,
            "shelter_name": user.shelter.shelter_name,
            "shelter_type": user.shelter.shelter_type,
            "city": user.shelter.city
        }

    return UserProfileResponse(
        user_id=user.user_id,
        email=user.email,
        user_type=user.user_type,
        is_active=user.is_active,
        created_at=user.created_at,
        restaurant=rest_dict,
        shelter=shelter_dict
    )
