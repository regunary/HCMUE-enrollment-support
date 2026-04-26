import random
import pytz
import redis
import phonenumbers
from datetime import datetime
from django.conf import settings

# Redis connection for OTP storage
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD,
    db=0,
    decode_responses=True
)

def validate_phone_number(phone_number: str) -> bool:
    """Validate phone number format using phonenumbers library"""
    try:
        # Try parsing with default region code (VN)
        parsed_number = phonenumbers.parse(phone_number, "VN")
        return phonenumbers.is_valid_number(parsed_number)
    except phonenumbers.NumberParseException:
        try:
            # Try parsing with international format
            parsed_number = phonenumbers.parse(phone_number)
            return phonenumbers.is_valid_number(parsed_number)
        except phonenumbers.NumberParseException:
            return False

def format_phone_number(phone_number: str) -> str:
    """Format phone number to standard E.164 format"""
    try:
        parsed_number = phonenumbers.parse(phone_number, "VN")
        return phonenumbers.format_number(parsed_number, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        parsed_number = phonenumbers.parse(phone_number)
        return phonenumbers.format_number(parsed_number, phonenumbers.PhoneNumberFormat.E164)

def get_utcnow_int():
    now = (
        datetime.utcnow()
        .replace(tzinfo=pytz.utc)
        .astimezone(
            pytz.timezone("Asia/Ho_Chi_Minh"),
        )
    )
    return round(now.timestamp() * 1000)

def generate_otp():
    return str(random.randint(000000, 999999))

def store_otp(phone_number: str, otp: str):
    """Store OTP in Redis with 2 minutes expiration"""
    redis_client.setex(f"otp:{phone_number}", 120, otp)

def verify_otp(phone_number: str, otp: str) -> bool:
    """Verify OTP from Redis"""
    stored_otp = redis_client.get(f"otp:{phone_number}")
    if stored_otp is None:
        return False
    return stored_otp == otp
