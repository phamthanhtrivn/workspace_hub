from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.common.schemas import RequestSchema
from app.modules.documents.constants import MAX_FILES


class CreateConversation(RequestSchema):
    source_ids: list[UUID] = Field(min_length=1, max_length=MAX_FILES)
    title: str = Field(default="Document questions", min_length=1, max_length=200)


class CreateMessage(RequestSchema):
    content: str = Field(min_length=1, max_length=4000)


class AnswerStatus(StrEnum):
    ANSWERED = "ANSWERED"
    PARTIAL = "PARTIAL"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    CONFLICTING_SOURCES = "CONFLICTING_SOURCES"


class Claim(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=4000)
    citation_ids: list[str] = Field(max_length=12)


class ModelAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answer_status: AnswerStatus
    claims: list[Claim] = Field(min_length=1, max_length=20)


class RewrittenQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
