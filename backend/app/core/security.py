from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Union, Dict
import jwt
import bcrypt
from app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password.encode("utf-8")[:72], salt)
    return hashed.decode("utf-8")

def create_access_token(
    subject: Optional[Union[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode: Dict[str, Any] = {}
    if isinstance(subject, dict):
        to_encode.update(subject)
    elif subject is not None:
        to_encode["sub"] = str(subject)

    if data:
        to_encode.update(data)
    to_encode["exp"] = expire
    to_encode["iat"] = datetime.now(timezone.utc)

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return decoded
    except jwt.PyJWTError:
        return None
