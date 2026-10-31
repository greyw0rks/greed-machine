"""Assemble processed Kitten2 takes at their exact visual scene timestamps."""

import json
from pathlib import Path

import numpy as np
import soundfile as sf

PROJECT = Path(__file__).resolve().parents[1]
SAMPLE_RATE = 24000


def main():
    request = json.loads((PROJECT / "narration.json").read_text())
    metadata = json.loads((PROJECT / "assets/audio/voice/metadata.json").read_text())
    output = np.zeros(round(request["duration"] * SAMPLE_RATE), dtype=np.float32)
    last_end = 0
    manifest = []
    for line in request["lines"]:
        take = metadata[line["id"]]
        if take["text"] != line["text"] or take["start"] != line["start"]:
            raise ValueError(f'{line["id"]}: regenerate the take after changing its script or start.')
        audio, rate = sf.read(PROJECT / take["path"], dtype="float32")
        if rate != SAMPLE_RATE or audio.ndim != 1 or len(audio) == 0:
            raise ValueError(f'{line["id"]}: expected nonempty mono 24 kHz audio.')
        start = round(line["start"] * SAMPLE_RATE)
        end = start + len(audio)
        if start < last_end or end > round(line["end"] * SAMPLE_RATE) + 1:
            raise ValueError(f'{line["id"]}: narration overlaps a scene or another take.')
        output[start:end] = audio
        last_end = end
        manifest.append({"id": line["id"], "start": start / SAMPLE_RATE,
                         "end": end / SAMPLE_RATE, "text": line["text"]})
    path = PROJECT / "assets/audio/narration-kitten2.wav"
    sf.write(path, output, SAMPLE_RATE, subtype="PCM_16")
    path.with_suffix(".json").write_text(json.dumps({
        "provider": request["provider"],
        "model": request["model"],
        "sample_rate": SAMPLE_RATE,
        "duration": len(output) / SAMPLE_RATE,
        "lines": manifest,
    }, indent=2) + "\n")
    print(f"Assembled {len(manifest)} voice takes into {len(output) / SAMPLE_RATE:.2f}s: "
          f"{path.relative_to(PROJECT)}")


if __name__ == "__main__":
    main()
