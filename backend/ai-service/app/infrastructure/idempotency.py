import hashlib
import json

from fastapi import Header
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.common.errors import ApiError, ErrorCode
from app.infrastructure.database import Idempotency


def request_key(
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=1, max_length=128),
) -> str:
    return idempotency_key


def fingerprint(payload: dict) -> str:
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def lock_key(session: Session, value: str) -> None:
    if session.bind.dialect.name == "postgresql":
        lock_id = int.from_bytes(hashlib.sha256(value.encode()).digest()[:8], signed=True)
        session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock_id})


def existing(session: Session, owner: str, operation: str, key: str, payload: dict) -> dict | None:
    lock_key(session, f"{owner}:{operation}:{key}")
    record = session.scalar(
        select(Idempotency).where(
            Idempotency.owner_id == owner,
            Idempotency.operation == operation,
            Idempotency.request_key == key,
        )
    )
    if record:
        if record.request_hash != fingerprint(payload):
            raise ApiError(
                ErrorCode.IDEMPOTENCY_CONFLICT, "Idempotency key has different content", 409
            )
        return record.result
    return None


def remember(
    session: Session, owner: str, operation: str, key: str, payload: dict, result: dict
) -> None:
    session.add(
        Idempotency(
            owner_id=owner,
            operation=operation,
            request_key=key,
            request_hash=fingerprint(payload),
            result=result,
        )
    )
