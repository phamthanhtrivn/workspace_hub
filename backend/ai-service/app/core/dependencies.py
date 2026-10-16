from typing import Annotated

from fastapi import Depends, Request

from app.core.auth import Actor, authenticated_actor
from app.infrastructure.idempotency import request_key

ActorDependency = Annotated[Actor, Depends(authenticated_actor)]
IdempotencyKey = Annotated[str, Depends(request_key)]


def runtime(request: Request):
    return request.app.state.runtime


RuntimeDependency = Annotated[object, Depends(runtime)]
