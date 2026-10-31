"""Align the concept script to local ASR timing, preserving recognizer output.

Inspect transcript.json and the reported differences before using this output.
Alignment corrects recognizer spelling; it cannot repair unclear speech.
"""
import difflib
import json
import re
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
request = json.loads((PROJECT / 'narration.json').read_text())
transcript = json.loads((PROJECT / 'assets/transcript.json').read_text())
metadata = json.loads((PROJECT / 'assets/audio/voice/metadata.json').read_text())
# These are reviewed spelling variants and homophones in the local recognizer.
# Keep numeric differences unnormalized so a changed profit range stays visible.
phonetic_variants = {'by': 'buy', 'memicoin': 'memecoin'}
def normalize(text):
    word = re.sub(r'[^a-z0-9]', '', text.lower())
    return phonetic_variants.get(word, word)
aligned = []
corrections = []
for line in request['lines']:
    expected = line['text'].split()
    observed = [word for word in transcript['words'] if word['line'] == line['id']]
    if not observed:
        raise ValueError(f"No ASR timing for {line['id']}")
    match = difflib.SequenceMatcher(None, list(map(normalize, expected)),
                                   [normalize(word['text']) for word in observed], autojunk=False)
    if match.ratio() < .8:
        raise ValueError(f"Review or regenerate {line['id']}: poor script match {match.ratio():.2f}")
    for tag, a0, a1, b0, b1 in match.get_opcodes():
        if tag != 'equal':
            corrections.append({'line': line['id'], 'type': tag,
                                'script': ' '.join(expected[a0:a1]),
                                'recognized': ' '.join(w['text'] for w in observed[b0:b1])})
        if tag == 'equal':
            for index, word in enumerate(observed[b0:b1]):
                canonical = expected[a0 + index]
                if re.sub(r'[^a-z0-9]', '', word['text'].lower()) != re.sub(r'[^a-z0-9]', '', canonical.lower()):
                    corrections.append({'line': line['id'], 'type': 'reviewed_spelling_variant',
                                        'script': canonical, 'recognized': word['text']})
                aligned.append({**word, 'text': canonical})
        elif a1 > a0:
            start = observed[b0]['start'] if b0 < len(observed) else observed[-1]['end']
            end = observed[b1-1]['end'] if b1 > b0 else (
                observed[b0]['start'] if b0 < len(observed) else line['start'] + metadata[line['id']]['duration'])
            if end <= start:
                # A recognizer-skipped word uses the gap before the next match.
                start = observed[b0-1]['end'] if b0 else line['start']
            if end <= start:
                raise ValueError(f"No speech interval for {line['id']} / {expected[a0:a1]}")
            weights = [max(2, len(normalize(word))) for word in expected[a0:a1]]
            cursor = start
            for word, weight in zip(expected[a0:a1], weights):
                next_time = cursor + (end - start) * weight / sum(weights)
                aligned.append({'line': line['id'], 'text': word,
                                'start': round(cursor, 3), 'end': round(next_time, 3)})
                cursor = next_time
    actual = ' '.join(w['text'] for w in aligned if w['line'] == line['id'])
    if actual != line['text']:
        raise ValueError(f"Caption script mismatch for {line['id']}")
output = {'source': 'Concept script aligned to local Whisper word timing',
          'engine': transcript['engine'], 'modelRevision': transcript['modelRevision'],
          'corrections': corrections, 'words': aligned}
(PROJECT / 'assets/caption-words.json').write_text(json.dumps(output, indent=2) + '\n')
print(json.dumps({'words': len(aligned), 'corrections': corrections}, indent=2))
