"""Prepare actual browser footage while retaining the capture manifest.

The cuts preserve a real control action and its observed result. The verification
edit removes the network wait; it never replaces a UI result with a drawn one.
"""
import json, subprocess, shutil
from pathlib import Path
project=Path(__file__).resolve().parents[1]
repo=project.parents[1]
ffmpeg=shutil.which('ffmpeg')
ffprobe=shutil.which('ffprobe')
if not ffmpeg or not ffprobe: raise RuntimeError('Install FFmpeg and ffprobe.')
manifest=json.loads((project/'assets/capture-manifest.json').read_text())
out=project/'assets/clips'; out.mkdir(exist_ok=True)
starts={'welcome':.5,'cycle':2.4,'debate':.7,'security':1.4,'payouts':2,'proof':.5,'results':.5}
for shot in manifest['shots']:
 source=repo/shot['path']
 duration=float(subprocess.check_output([ffprobe,'-v','error','-show_entries','format=duration','-of','csv=p=0',str(source)],text=True))
 target=12 if shot['id']=='results' else 10
 dest=out/f"{shot['id']}.mp4"
 if shot['id']=='verify':
  first=.9; first_length=3; result=max(first+first_length,duration-5)
  filters=(f'[0:v]trim=start={first}:duration={first_length},setpts=PTS-STARTPTS[a];'
           f'[0:v]trim=start={result}:duration=4.8,setpts=PTS-STARTPTS[b];'
           f'[a][b]concat=n=2:v=1:a=0,tpad=stop_mode=clone:stop_duration=4,fps=30[v]')
  args=['-i',str(source),'-filter_complex',filters,'-map','[v]']
  edit={'segments':[{'start':first,'duration':first_length},{'start':result,'duration':4.8}],'rpcWaitShortened':True,'rawRpcWaitSeconds':manifest['verificationWaitSeconds']}
 else:
  start=starts[shot['id']]; available=min(target,duration-start)
  args=['-ss',str(start),'-i',str(source),'-vf',f'trim=duration={available},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={target},fps=30']
  edit={'start':start,'duration':available}
 subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y',*args,'-an','-t',str(target),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-threads','2','-movflags','+faststart',str(dest)],check=True)
 shot.update(sourceDuration=duration,edit=edit,editDuration=target,holdFinalFrame=True)
 print(shot['id'],target,flush=True)
(out/'edit-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
