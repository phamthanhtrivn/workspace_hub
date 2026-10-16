"""Test-only API process: real database/jobs/routes, fake storage and Gemini."""

import tempfile
import threading
from contextlib import asynccontextmanager

import uvicorn

from app.core import runtime
from app.core.config import Settings
from app.main import create_app
from app.modules.jobs.runner import claim, execute
from tests.feature_fakes import DocumentsFake, ProviderFake

DOCUMENT_IDS = [f"20000000-0000-4000-8000-{number:012d}" for number in range(1, 4)]


def main():
    settings = Settings()
    if settings.node_env != "test":
        raise RuntimeError("The fake integration stack is restricted to NODE_ENV=test")
    with tempfile.TemporaryDirectory(prefix="ai-kong-fixtures-") as directory:
        documents = DocumentsFake(directory)
        documents.add(DOCUMENT_IDS[0], "requirements.txt", b"Delivery date: 20 October 2026")
        documents.add(
            DOCUMENT_IDS[1],
            "minutes.md",
            b"# Meeting\n\nDelivery date: 25 October 2026",
            "text/markdown",
        )
        documents.add(DOCUMENT_IDS[2], "invalid.pdf", b"Not actually a PDF", "application/pdf")
        runtime.DocumentClient = lambda config: documents
        app = create_app(settings)
        original_lifespan = app.router.lifespan_context

        @asynccontextmanager
        async def lifespan(application):
            async with original_lifespan(application):
                stopped = threading.Event()
                database = application.state.runtime.database

                def worker():
                    while not stopped.is_set():
                        claimed = claim(database, settings)
                        if claimed:
                            execute(
                                database,
                                documents,
                                settings,
                                *claimed,
                                provider_factory=ProviderFake,
                            )
                        else:
                            stopped.wait(0.1)

                thread = threading.Thread(target=worker, daemon=True)
                thread.start()
                try:
                    yield
                finally:
                    stopped.set()
                    thread.join(timeout=30)

        app.router.lifespan_context = lifespan
        uvicorn.run(app, host=settings.host, port=settings.port, access_log=False)


if __name__ == "__main__":
    main()
