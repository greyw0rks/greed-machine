"""Transcribe processed takes with the already cached Whisper base model.

No model downloads or paid provider calls. Keep raw words for caption review.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
os.environ['HF_HUB_OFFLINE']='1'
os.environ['HF_HUB_DISABLE_PROGRESS_BARS']='1'
import numpy as np
import soundfile as sf
import torch
from transformers import pipeline, AutoProcessor, WhisperForConditionalGeneration
PROJECT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--model',choices=['openai/whisper-base','openai/whisper-medium.en'],default='openai/whisper-base')
parser.add_argument('--output',type=Path,default=PROJECT/'assets/transcript.json')
parser.add_argument('--ids',nargs='+')
parser.add_argument('--merge',action='store_true',help='Replace selected takes while retaining other words from the same ASR model.')
parser.add_argument('--raw',action='store_true',help='Check the original take before tempo adjustment; keep this output separate from caption timing.')
args=parser.parse_args()
torch.set_num_threads(2)
cache=Path.home()/'.cache/huggingface/hub'/('models--'+args.model.replace('/','--'))
revision=(cache/'refs/main').read_text().strip()
repo=cache/'snapshots'/revision
processor=AutoProcessor.from_pretrained(repo,local_files_only=True)
model=WhisperForConditionalGeneration.from_pretrained(repo,local_files_only=True,attn_implementation='eager')
asr=pipeline('automatic-speech-recognition',model=model,tokenizer=processor.tokenizer,feature_extractor=processor.feature_extractor,device=-1)
metadata=json.loads((PROJECT/'assets/audio/voice/metadata.json').read_text())
if args.ids:
    if set(args.ids)-set(metadata):parser.error('Unknown take id.')
    metadata={key:value for key,value in metadata.items() if key in args.ids}
words=[]
if args.merge and args.output.exists():
    previous=json.loads(args.output.read_text())
    if previous['modelRevision']!=revision:raise ValueError('Cannot merge different ASR revisions.')
    words=[word for word in previous['words'] if word['line'] not in metadata]
for take in metadata.values():
    with tempfile.TemporaryDirectory(prefix='greed-caption-') as temp:
        wav=Path(temp)/'take.wav'
        source=PROJECT/'assets/audio/voice/raw'/f"{take['id']}.wav" if args.raw else PROJECT/take['path']
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-ar','16000','-ac','1',str(wav)],check=True)
        samples,rate=sf.read(wav,dtype='float32')
        options={} if args.model.endswith('.en') else {'language':'en','task':'transcribe'}
        result=asr({'raw':samples,'sampling_rate':rate},return_timestamps='word',generate_kwargs=options)
        for chunk in result['chunks']:
            start,end=chunk['timestamp']
            if start is None or end is None:continue
            text=chunk['text'].strip()
            if text:words.append({'line':take['id'],'text':text,'start':round(take['start']+start,3),'end':round(min(take['start']+end,take['start']+len(samples)/rate),3)})
        print(take['id']+': '+result['text'],flush=True)
        args.output.write_text(json.dumps({'engine':args.model+' (local cache)','modelRevision':revision,'words':words},indent=2)+'\n')
words.sort(key=lambda w:w['start'])
args.output.write_text(json.dumps({'engine':args.model+' (local cache)','modelRevision':revision,'words':words},indent=2)+'\n')
