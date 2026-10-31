"""Generate Greed narration with the user's cached KittenTTS 2 voice reference.

Run with ~/kitten-tts/.venv/bin/python scripts/generate_narration.py.
Pass line ids to generate a subset, and --cpu-int8 for older laptop CPUs.
Raw takes and generation metadata are retained under assets/audio/voice/raw.
"""

import argparse
import ctypes
import gc
import hashlib
import json
import os
from pathlib import Path
import time

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")

import soundfile as sf
import torch
from kittenml.kittentts2 import KittenTTS2

PROJECT = Path(__file__).resolve().parents[1]
REQUEST = PROJECT / "narration.json"
OUT = PROJECT / "assets/audio/voice/raw"
REFERENCE_TEXT = Path.home() / "atlas/demo-video/scripts/reference.txt"


def quantize_cpu_linears(module):
    """Pack LM linear layers individually to avoid a full float32 model copy.

    Skylake CPUs cannot multiply bf16 natively. Dynamic int8 uses their CPU
    kernels while keeping embeddings, norms and speaker conditioning float32.
    """
    from torch.ao.nn.quantized.dynamic import Linear as Int8Linear
    from torch.ao.quantization import default_dynamic_qconfig

    count = 0
    for name, child in list(module.named_children()):
        if isinstance(child, torch.nn.Linear):
            child.float()
            child.qconfig = default_dynamic_qconfig
            module._modules[name] = Int8Linear.from_float(child)
            count += 1
            del child
        else:
            count += quantize_cpu_linears(child)
    return count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ids", nargs="*")
    parser.add_argument("--cpu-int8", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--threads", type=int, default=2)
    parser.add_argument("--reference", type=Path)
    parser.add_argument("--reference-text", type=Path, default=REFERENCE_TEXT)
    args = parser.parse_args()
    request = json.loads(REQUEST.read_text())
    lines = request["lines"]
    known = {line["id"] for line in lines}
    if set(args.ids) - known:
        parser.error(f"unknown line ids: {sorted(set(args.ids) - known)}")
    if args.ids:
        lines = [line for line in lines if line["id"] in args.ids]

    reference = (args.reference or Path(request["reference"])).expanduser()
    reference_text = args.reference_text.expanduser().read_text().strip()
    if not reference.is_file() or not reference_text:
        raise ValueError("The user's voice reference and its transcript are required.")
    reference_hash = hashlib.sha256(reference.read_bytes()).hexdigest()

    torch.set_num_threads(min(args.threads, os.cpu_count() or 1))
    torch.set_num_interop_threads(1)
    cache = Path.home() / ".cache/huggingface/hub/models--KittenML--kitten-tts-2"
    revision = (cache / "refs/main").read_text().strip()
    repo = cache / "snapshots" / revision
    pending = []
    for line in lines:
        output = OUT / f'{line["id"]}.wav'
        seed = 20261022 + next(i for i, item in enumerate(request["lines"]) if item["id"] == line["id"])
        identity = {
            "text": line["text"], "model": request["model"], "revision": revision,
            "reference_sha256": reference_hash, "preset": "stable",
            "seed": seed, "cpu_int8": args.cpu_int8,
        }
        if output.exists() and output.with_suffix(".json").exists() and not args.force:
            old = json.loads(output.with_suffix(".json").read_text())
            if all(old.get(key) == value for key, value in identity.items()):
                print(f'{line["id"]}: reusing matching take.', flush=True)
                continue
        pending.append((line, identity))
    if not pending:
        return
    config = json.loads((repo / "config.json").read_text())
    print(f"Loading KittenTTS 2 ({revision[:12]}) from the local cache...", flush=True)
    model = KittenTTS2(repo, config)
    if args.cpu_int8:
        if model.device != "cpu":
            raise ValueError("--cpu-int8 requires CPU inference.")
        print("Packing CPU linear layers...", flush=True)
        count = quantize_cpu_linears(model.model.model)
        # lm_head is itself a linear module, so replace it explicitly.
        if isinstance(model.model.lm_head, torch.nn.Linear):
            from torch.ao.nn.quantized.dynamic import Linear as Int8Linear
            from torch.ao.quantization import default_dynamic_qconfig
            head = model.model.lm_head
            head.float()
            head.qconfig = default_dynamic_qconfig
            model.model.lm_head = Int8Linear.from_float(head)
            del head
            count += 1
        model.model.float()
        model.dtype = torch.float32
        gc.collect()
        # Return the discarded unpacked checkpoints to Linux before inference.
        # The laptop has limited RAM; retaining them in malloc causes swapping.
        libc = ctypes.CDLL("libc.so.6")
        libc.malloc_trim(0)
        print(f"Packed {count} LM layers; speaker conditioning remains float32.", flush=True)
    print(f"Loaded on {model.device}, {model.sample_rate} Hz. Preparing the voice reference...", flush=True)
    model._clone_reference(str(reference), reference_text)
    gc.collect()
    if args.cpu_int8:
        libc.malloc_trim(0)
    print("Voice reference ready.", flush=True)
    OUT.mkdir(parents=True, exist_ok=True)

    for line, identity in pending:
        output = OUT / f'{line["id"]}.wav'
        metadata_path = output.with_suffix(".json")
        seed = identity["seed"]
        print(f'{line["id"]}: generating {len(line["text"])} characters...', flush=True)
        started = time.monotonic()
        with torch.inference_mode():
            audio = model.generate(
                line["text"],
                reference=str(reference),
                reference_text=reference_text,
                preset="stable",
                advanced={"seed": seed},
            )
        elapsed = time.monotonic() - started
        if audio is None or len(audio) == 0:
            raise RuntimeError(f'{line["id"]}: KittenTTS 2 returned no audio.')
        sf.write(output, audio, model.sample_rate, subtype="PCM_16")
        seconds = len(audio) / model.sample_rate
        metadata_path.write_text(json.dumps({
            **identity,
            "sample_rate": model.sample_rate,
            "duration": seconds,
            "generation_seconds": round(elapsed, 3),
        }, indent=2) + "\n")
        print(f'{line["id"]}: {seconds:.2f}s audio in {elapsed:.1f}s -> {output.relative_to(PROJECT)}', flush=True)


if __name__ == "__main__":
    main()
