-- Oracle DB Schema for FoodBridge

-- 1. Users Table (Base Authentication)
CREATE TABLE users (
    user_id NUMBER PRIMARY KEY,
    email VARCHAR2(255) UNIQUE NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    user_type VARCHAR2(50) NOT NULL CHECK (user_type IN ('RESTAURANT', 'SHELTER', 'ADMIN')),
    created_at TIMESTAMP DEFAULT SYSDATE,
    updated_at TIMESTAMP DEFAULT SYSDATE,
    is_active CHAR(1) DEFAULT 'Y'
);
CREATE SEQUENCE users_seq START WITH 1;

-- 2. Restaurants Table
CREATE TABLE restaurants (
    restaurant_id NUMBER PRIMARY KEY,
    user_id NUMBER NOT NULL UNIQUE,
    restaurant_name VARCHAR2(255) NOT NULL,
    address VARCHAR2(500) NOT NULL,
    city VARCHAR2(100) NOT NULL,
    postal_code VARCHAR2(20),
    phone_number VARCHAR2(20),
    email_contact VARCHAR2(255),
    latitude BINARY_DOUBLE,
    longitude BINARY_DOUBLE,
    total_donations_count NUMBER DEFAULT 0,
    total_reward_points NUMBER DEFAULT 0,
    created_at TIMESTAMP DEFAULT SYSDATE,
    updated_at TIMESTAMP DEFAULT SYSDATE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE SEQUENCE restaurants_seq START WITH 1000;
CREATE INDEX idx_restaurants_city ON restaurants(city);

-- 3. Shelters Table
CREATE TABLE shelters (
    shelter_id NUMBER PRIMARY KEY,
    user_id NUMBER NOT NULL UNIQUE,
    shelter_name VARCHAR2(255) NOT NULL,
    shelter_type VARCHAR2(100) NOT NULL CHECK (shelter_type IN ('SHELTER', 'COMMUNITY_CENTER', 'NGO')),
    address VARCHAR2(500) NOT NULL,
    city VARCHAR2(100) NOT NULL,
    postal_code VARCHAR2(20),
    phone_number VARCHAR2(20),
    email_contact VARCHAR2(255),
    latitude BINARY_DOUBLE,
    longitude BINARY_DOUBLE,
    beneficiaries_count NUMBER,
    operational_hours VARCHAR2(100),
    dietary_restrictions VARCHAR2(500),
    created_at TIMESTAMP DEFAULT SYSDATE,
    updated_at TIMESTAMP DEFAULT SYSDATE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE SEQUENCE shelters_seq START WITH 2000;
CREATE INDEX idx_shelters_city ON shelters(city);

-- 4. Listings Table
CREATE TABLE listings (
    listing_id NUMBER PRIMARY KEY,
    restaurant_id NUMBER NOT NULL,
    food_name VARCHAR2(255) NOT NULL,
    food_quantity NUMBER NOT NULL,
    quantity_unit VARCHAR2(50) NOT NULL CHECK (quantity_unit IN ('PORTIONS', 'KG', 'LB', 'LITERS')),
    food_description CLOB,
    quality_safety_note VARCHAR2(1000),
    dietary_info VARCHAR2(500),
    allergen_info VARCHAR2(500),
    ready_time TIMESTAMP NOT NULL,
    pickup_deadline TIMESTAMP NOT NULL,
    listing_duration_minutes NUMBER NOT NULL,
    status VARCHAR2(50) DEFAULT 'LISTED' NOT NULL CHECK (status IN ('LISTED', 'CLAIMED', 'PICKED_UP', 'EXPIRED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT SYSDATE,
    claimed_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    created_by_ai CHAR(1) DEFAULT 'N',
    ai_confidence_score BINARY_DOUBLE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE CASCADE
);
CREATE SEQUENCE listings_seq START WITH 5000;
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_restaurant ON listings(restaurant_id);
CREATE INDEX idx_listings_pickup_deadline ON listings(pickup_deadline);

-- 5. Claims Table
CREATE TABLE claims (
    claim_id NUMBER PRIMARY KEY,
    listing_id NUMBER NOT NULL UNIQUE,
    shelter_id NUMBER NOT NULL,
    restaurant_id NUMBER NOT NULL,
    claimed_at TIMESTAMP DEFAULT SYSDATE,
    pickup_arranged_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    claim_status VARCHAR2(50) DEFAULT 'CLAIMED' NOT NULL CHECK (claim_status IN ('CLAIMED', 'PICKED_UP', 'CANCELLED', 'REVERTED')),
    revert_reason VARCHAR2(500),
    reverted_at TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id) ON DELETE CASCADE,
    FOREIGN KEY (shelter_id) REFERENCES shelters(shelter_id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id)
);
CREATE SEQUENCE claims_seq START WITH 10000;
CREATE INDEX idx_claims_shelter ON claims(shelter_id);
CREATE INDEX idx_claims_restaurant ON claims(restaurant_id);
CREATE INDEX idx_claims_status ON claims(claim_status);

-- 6. Chat Messages Table
CREATE TABLE chat_messages (
    message_id NUMBER PRIMARY KEY,
    claim_id NUMBER NOT NULL,
    sender_id NUMBER NOT NULL,
    sender_type VARCHAR2(50) NOT NULL CHECK (sender_type IN ('RESTAURANT', 'SHELTER')),
    message_text CLOB NOT NULL,
    sent_at TIMESTAMP DEFAULT SYSDATE,
    read_at TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(user_id)
);
CREATE SEQUENCE chat_messages_seq START WITH 50000;
CREATE INDEX idx_chat_claim ON chat_messages(claim_id);
CREATE INDEX idx_chat_sent_at ON chat_messages(sent_at);

-- 7. Reward Points Table
CREATE TABLE reward_points (
    reward_id NUMBER PRIMARY KEY,
    restaurant_id NUMBER NOT NULL,
    points_earned NUMBER NOT NULL,
    claim_id NUMBER,
    transaction_type VARCHAR2(50) NOT NULL CHECK (transaction_type IN ('DONATION_COMPLETION', 'BONUS', 'REDEMPTION')),
    transaction_date TIMESTAMP DEFAULT SYSDATE,
    notes VARCHAR2(500),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id)
);
CREATE SEQUENCE reward_points_seq START WITH 100000;
CREATE INDEX idx_rewards_restaurant ON reward_points(restaurant_id);

-- 8. Listing Audit Log
CREATE TABLE listing_audit_log (
    audit_id NUMBER PRIMARY KEY,
    listing_id NUMBER NOT NULL,
    ai_input_raw CLOB,
    ai_output_structured CLOB,
    ai_model_version VARCHAR2(50),
    confidence_score BINARY_DOUBLE,
    human_corrected CHAR(1) DEFAULT 'N',
    audit_timestamp TIMESTAMP DEFAULT SYSDATE,
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id) ON DELETE CASCADE
);
CREATE SEQUENCE audit_log_seq START WITH 200000;
