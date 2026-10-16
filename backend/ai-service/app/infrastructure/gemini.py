import math

from google import genai
from google.genai import errors, types

from app.common.errors import ErrorCode, ProcessingError
from app.modules.documents.constants import EMBEDDING_DIMENSIONS
from app.modules.ingestion.chunking import count_tokens
from app.modules.usage.service import UsageService


class GeminiProvider:
    def __init__(self, database, settings, job_id, check_active):
        self.settings, self.job_id, self.check_active = settings, job_id, check_active
        self.usage = UsageService(database, settings)
        self.client = genai.Client(
            api_key=settings.gemini_api_key.get_secret_value(),
            http_options=types.HttpOptions(
                timeout=settings.provider_timeout_seconds * 1000,
                retry_options=types.HttpRetryOptions(attempts=1),
            ),
        )

    def close(self):
        self.client.close()

    def _call(self, model, operation, content, execute):
        self.check_active()
        call_id = self.usage.reserve(self.job_id, model, operation, count_tokens(content))
        try:
            result = execute()
            self.usage.complete(call_id, "SUCCEEDED", getattr(result, "usage_metadata", None))
            self.check_active()
            return result
        except ProcessingError:
            raise
        except errors.APIError as error:
            self.usage.complete(call_id, "FAILED")
            if error.code == 429:
                raise ProcessingError(
                    ErrorCode.PROVIDER_QUOTA_EXCEEDED, "Gemini quota exhausted", retryable=True
                ) from None
            raise ProcessingError(
                ErrorCode.PROVIDER_UNAVAILABLE, "Gemini request failed", retryable=error.code >= 500
            ) from None
        except Exception:
            self.usage.complete(call_id, "UNKNOWN")
            raise ProcessingError(
                ErrorCode.PROVIDER_UNAVAILABLE, "Gemini request did not complete reliably"
            ) from None

    def embed(self, content, *, title=None, model=None):
        embedding_model = model or self.settings.gemini_embedding_model
        prepared = (
            f"title: {title} | text: {content}"
            if title is not None
            else f"task: question answering | query: {content}"
        )
        result = self._call(
            embedding_model,
            "EMBED",
            prepared,
            lambda: self.client.models.embed_content(
                model=embedding_model,
                contents=prepared,
                config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSIONS),
            ),
        )
        if not result.embeddings or len(result.embeddings) != 1:
            raise ProcessingError(
                ErrorCode.INVALID_MODEL_OUTPUT, "Expected one embedding per chunk"
            )
        vector = result.embeddings[0].values
        if len(vector) != EMBEDDING_DIMENSIONS or not all(math.isfinite(value) for value in vector):
            raise ProcessingError(
                ErrorCode.INVALID_MODEL_OUTPUT, "Invalid embedding dimensions or values"
            )
        magnitude = math.sqrt(sum(value * value for value in vector))
        if not magnitude:
            raise ProcessingError(ErrorCode.INVALID_MODEL_OUTPUT, "Empty embedding vector")
        return [value / magnitude for value in vector]

    def generate(self, prompt, schema, system):
        result = self._call(
            self.settings.gemini_model,
            "GENERATE",
            system + prompt,
            lambda: self.client.models.generate_content(
                model=self.settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0.1,
                    max_output_tokens=4096,
                    response_mime_type="application/json",
                    response_schema=schema,
                ),
            ),
        )
        try:
            if (
                not result.candidates
                or str(result.candidates[0].finish_reason).split(".")[-1] != "STOP"
            ):
                raise ValueError()
            return schema.model_validate_json(result.text)
        except Exception:
            raise ProcessingError(
                ErrorCode.INVALID_MODEL_OUTPUT, "Gemini returned an incomplete or invalid response"
            ) from None
