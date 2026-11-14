import math


def quota_info(response):
    daily = False
    try:
        daily = any('PerDay' in str(violation.get('quotaId', ''))
                    for detail in response.json().get('error', {}).get('details', [])
                    for violation in detail.get('violations', []))
    except (ValueError, AttributeError, TypeError):
        pass
    try:
        delay = float(response.headers.get('retry-after', '60'))
    except (ValueError, TypeError):
        delay = 60
    return daily, delay if math.isfinite(delay) else 60


class InvalidSource(ValueError):
    """A source validation error, distinct from model/configuration failures."""

    def __init__(self, message="Invalid source", code="INVALID_SOURCE"):
        super().__init__(message)
        self.code = code


class ValidationBusy(RuntimeError):
    """Reject preflight rather than queue more CPU/memory-heavy work."""


class FallbackPending(RuntimeError):
    """Local document conversion is queued; querying must not run inference inline."""
