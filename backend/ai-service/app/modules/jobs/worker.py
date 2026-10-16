import logging
import signal
import tempfile
import threading
import time
from datetime import timedelta
from pathlib import Path

from sqlalchemy import update

from app.core.config import Settings
from app.core.logging import configure_logging
from app.core.runtime import Runtime
from app.infrastructure.database import now
from app.modules.documents.constants import State
from app.modules.jobs.models import Job
from app.modules.jobs.retention import cleanup
from app.modules.jobs.runner import claim, execute, recover

HEARTBEAT = Path(tempfile.gettempdir()) / "workspacehub-ai-worker.heartbeat"
logger = logging.getLogger("ai_service.worker")


def healthy():
    return HEARTBEAT.exists() and time.time() - HEARTBEAT.stat().st_mtime < 30


def run():
    settings = Settings()
    configure_logging(settings.log_level)
    stopped = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stopped.set())
    signal.signal(signal.SIGINT, lambda *_: stopped.set())
    runtime = Runtime(settings) if settings.ai_enabled else None
    current = []

    def heartbeat():
        while not stopped.is_set():
            try:
                if runtime:
                    with runtime.database.sessions.begin() as session:
                        if current:
                            job_id, token = current[:]
                            session.execute(
                                update(Job)
                                .where(
                                    Job.id == job_id,
                                    Job.lease_token == token,
                                    Job.status == State.RUNNING,
                                )
                                .values(
                                    lease_until=now()
                                    + timedelta(seconds=settings.job_lease_seconds)
                                )
                            )
                        else:
                            session.connection().exec_driver_sql("SELECT 1")
                HEARTBEAT.touch()
            except Exception:
                logger.error("Worker heartbeat unavailable")
            stopped.wait(5)

    thread = threading.Thread(target=heartbeat, daemon=True)
    thread.start()
    last_cleanup = 0
    try:
        while not stopped.is_set():
            if not runtime:
                stopped.wait(settings.worker_poll_seconds)
                continue
            try:
                recover(runtime.database)
                if time.monotonic() - last_cleanup > 3600:
                    cleanup(runtime.database, settings.retention_days)
                    last_cleanup = time.monotonic()
                claimed = claim(runtime.database, settings)
                if claimed:
                    current[:] = claimed
                    execute(runtime.database, runtime.client, settings, *claimed)
                    current.clear()
                else:
                    stopped.wait(settings.worker_poll_seconds)
            except Exception:
                current.clear()
                logger.error("Worker cycle failed; pending jobs remain durable")
                stopped.wait(settings.worker_poll_seconds)
    finally:
        stopped.set()
        thread.join(timeout=6)
        if runtime:
            runtime.close()
        HEARTBEAT.unlink(missing_ok=True)


if __name__ == "__main__":
    run()
