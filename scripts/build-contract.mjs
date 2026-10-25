import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const rustupCargo=join(homedir(),'.cargo','bin',process.platform==='win32'?'cargo.exe':'cargo');
const cargo=process.env.CARGO||(existsSync(rustupCargo)?rustupCargo:'cargo');
const selected=process.argv.indexOf('--contract');
const contract=selected>=0?process.argv[selected+1]:process.argv.includes('--token')?'test-token':'policy';
if(!['policy','test-token','test-dollar','demo-vault','business'].includes(contract))throw new Error('Select a known Greed contract.');
const result=spawnSync(cargo,['build','--locked','--manifest-path',`contracts/${contract}/Cargo.toml`,'--target','wasm32-unknown-unknown','--release'],{stdio:'inherit'});
if(result.error){console.error('Could not run Cargo. Install Rust 1.93 or newer and the wasm32-unknown-unknown target.');process.exitCode=1;}
else process.exitCode=result.status??1;
