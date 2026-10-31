"""Trim pauses, level the cloned voice and fit each take to its scene window.

Raw KittenTTS 2 output is retained. A take that needs more than a 35% tempo
increase fails rather than clipping speech or moving unrelated visual timing.
"""

import argparse
import json
from pathlib import Path
import subprocess
import tempfile

PROJECT = Path(__file__).resolve().parents[1]
RAW = PROJECT / "assets/audio/voice/raw"
OUT = PROJECT / "assets/audio/voice"
MAX_TEMPO = 1.35
TRIM = (
    "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-35dB:"
    "start_silence=0.04:stop_periods=-1:stop_duration=0.35:"
    "stop_threshold=-35dB:stop_silence=0.15"
)


def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def duration(path):
    return float(run("ffprobe", "-v", "error", "-show_entries", "format=duration",
                     "-of", "csv=p=0", str(path)).strip())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ids", nargs="*")
    args = parser.parse_args()
    request = json.loads((PROJECT / "narration.json").read_text())
    known = {line["id"] for line in request["lines"]}
    if set(args.ids) - known:
        parser.error(f"unknown line ids: {sorted(set(args.ids) - known)}")
    lines = [line for line in request["lines"] if not args.ids or line["id"] in args.ids]
    metadata_path = OUT / "metadata.json"
    metadata = json.loads(metadata_path.read_text()) if metadata_path.exists() else {}
    OUT.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="atlas-narration-") as temp:
        for line in lines:
            raw = RAW / f'{line["id"]}.wav'
            if not raw.is_file():
                raise FileNotFoundError(f"Generate the missing take first: {raw}")
            generation = json.loads(raw.with_suffix(".json").read_text())
            if generation["text"] != line["text"]:
                raise ValueError(f'{line["id"]}: raw take belongs to a different script.')
            tight = Path(temp) / f'{line["id"]}.wav'
            run("ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(raw),
                "-af", TRIM, "-ar", "24000", str(tight))
            tight_duration = duration(tight)
            window = line["end"] - line["start"]
            tempo = max(1.0, tight_duration / (window - 0.06))
            if tempo > MAX_TEMPO:
                raise ValueError(
                    f'{line["id"]}: {tight_duration:.2f}s needs {tempo:.2f}x tempo '
                    f"for the {window:.2f}s slot; shorten the line or regenerate it."
                )
            output = OUT / f'{line["id"]}.wav'
            # Leave a little room around the final phoneme; no audible hard cut.
            filters = (
                f"atempo={tempo:.6f},apad=pad_dur=0.04,"
                "loudnorm=I=-18:TP=-1.5:LRA=7,afade=t=in:d=0.008"
            )
            run("ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(tight),
                "-af", filters, "-ar", "24000", "-ac", "1", str(output))
            seconds = duration(output)
            if seconds > window + 0.01:
                raise ValueError(f'{line["id"]}: processed speech overruns its scene slot.')
            metadata[line["id"]] = {
                **generation,
                "id": line["id"],
                "path": str(output.relative_to(PROJECT)),
                "start": line["start"],
                "slot_end": line["end"],
                "raw_duration": duration(raw),
                "duration": seconds,
                "tempo": round(tempo, 6),
            }
            metadata_path.write_text(json.dumps(metadata, indent=2) + "\n")
            print(f'{line["id"]}: {duration(raw):.2f}s raw -> {seconds:.2f}s '
                  f"at {tempo:.2f}x, starts at {line['start']:.2f}s", flush=True)

    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n")


if __name__ == "__main__":
    main()
