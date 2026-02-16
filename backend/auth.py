import os
import jwt
import requests
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache

security = HTTPBearer()


@lru_cache()
def get_jwks():
    """Fetch and cache JWKS from Clerk"""
    jwks_url = os.getenv("CLERK_JWKS_URL")
    if not jwks_url:
        raise ValueError("CLERK_JWKS_URL not configured")
    response = requests.get(jwks_url)
    response.raise_for_status()
    return response.json()


def verify_token(token: str) -> dict:
    """Verify Clerk JWT token and return claims"""
    try:
        # Get the signing key from JWKS
        jwks = get_jwks()
        unverified_header = jwt.get_unverified_header(token)

        # Find the key that matches the token's kid
        rsa_key = None
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
                break

        if not rsa_key:
            raise HTTPException(status_code=401, detail="Unable to find signing key")

        # Verify and decode the token
        payload = jwt.decode(
            token,
            jwt.PyJWK(rsa_key).key,
            algorithms=["RS256"],
            options={"verify_aud": False}  # Clerk doesn't use aud claim by default
        )

        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract and return the user ID from Clerk JWT token"""
    token = credentials.credentials
    payload = verify_token(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing user ID")

    return user_id
