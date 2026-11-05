"""Download public model weights once; no user audio is involved."""
import os
from pathlib import Path
from faster_whisper.utils import download_model

if __name__ == "__main__":
    directory = Path(os.environ.get("STT_MODEL_PATH", str(Path(__file__).parent / "models/small"))).resolve()
    model = os.environ.get("STT_MODEL", "small")
    directory.mkdir(parents=True, exist_ok=True)
    download_model(model, output_dir=str(directory))
    print(f"Local speech model ready: {directory}")
