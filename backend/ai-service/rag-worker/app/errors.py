class InvalidSource(ValueError):
    """A source validation error, distinct from model/configuration failures."""

    def __init__(self, message="Invalid source", code="INVALID_SOURCE"):
        super().__init__(message)
        self.code = code


class ValidationBusy(RuntimeError):
    """Reject preflight rather than queue more CPU/memory-heavy work."""
