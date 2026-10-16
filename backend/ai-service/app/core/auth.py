from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.common.errors import ApiError, ErrorCode

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Actor:
    id: str
    email: str

    def internal_headers(self) -> dict[str, str]:
        return {"X-Actor-Id": self.id, "X-Actor-Email": self.email}


def authenticated_actor(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Actor:
    try:
        settings = request.app.state.settings
        if not credentials or credentials.scheme.lower() != "bearer":
            raise ValueError()
        claims = jwt.decode(
            credentials.credentials,
            settings.jwt_secret_key.get_secret_value(),
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            options={"require": ["exp", "iss", "sub", "email", "role"]},
        )
        if claims["role"] not in {"USER", "ADMIN"} or not isinstance(claims["email"], str):
            raise ValueError()
        return Actor(str(UUID(claims["sub"])), claims["email"])
    except (jwt.PyJWTError, ValueError, TypeError, KeyError):
        raise ApiError(ErrorCode.UNAUTHORIZED, "A valid access token is required", 401) from None
