from typing import Any

TOPIC = "wh.meeting.captions"


def snapshot_caption(data: dict[str, Any]) -> tuple[str, bool]:
    """Bound the most recent utterance and the unstable WLK hypothesis."""
    lines = [
        line
        for line in data.get("lines", [])
        if line.get("text") and line.get("speaker") != -2
    ]
    text = lines[-1]["text"].strip() if lines else ""
    pending = data.get("buffer_transcription", "").strip()
    if pending:
        text = (text + " " + pending).strip()
    return text[-800:], not bool(pending)
