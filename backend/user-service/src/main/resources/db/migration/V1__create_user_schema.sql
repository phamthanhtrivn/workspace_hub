CREATE TABLE users (
    id uuid PRIMARY KEY,
    email varchar(255) NOT NULL UNIQUE,
    password_hash varchar(255),
    status varchar(255) NOT NULL CHECK (status IN ('ACTIVE', 'LOCKED')),
    role varchar(255) NOT NULL CHECK (role IN ('USER', 'ADMIN')),
    created_at timestamp(6), updated_at timestamp(6)
);
CREATE INDEX idx_user_email ON users(email);

CREATE TABLE user_profiles (
    id uuid PRIMARY KEY, user_id uuid NOT NULL UNIQUE REFERENCES users(id),
    full_name varchar(255), avatar_url varchar(255), phone_number varchar(255),
    dob date, bio text, created_at timestamp(6), updated_at timestamp(6)
);
CREATE TABLE account_settings (
    id uuid PRIMARY KEY, user_id uuid NOT NULL UNIQUE REFERENCES users(id),
    theme varchar(255), language varchar(255), timezone varchar(255),
    allow_new_direct_messages boolean NOT NULL DEFAULT true,
    mute_notification boolean NOT NULL DEFAULT false,
    created_at timestamp(6), updated_at timestamp(6)
);
CREATE TABLE oauth_accounts (
    id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
    provider varchar(255) NOT NULL CHECK (provider IN ('GOOGLE', 'LINKEDIN')),
    provider_user_id varchar(255) NOT NULL,
    created_at timestamp(6), updated_at timestamp(6)
);
CREATE TABLE refresh_tokens (
    id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
    token_hash varchar(255) NOT NULL UNIQUE, expires_at timestamp(6) NOT NULL,
    revoked boolean NOT NULL, revoked_at timestamp(6), device_id varchar(255),
    ip_address varchar(255), device_name varchar(255), browser varchar(255),
    operating_system varchar(255), platform varchar(255), location varchar(255),
    created_at timestamp(6)
);
