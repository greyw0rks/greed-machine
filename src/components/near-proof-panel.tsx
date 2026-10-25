"use client";
import { useState } from "react";
import { ArrowUpRight, Download, FlaskConical } from "lucide-react";
import type { NearObservation } from "@/lib/near-policy";

type Result = NearObservation | { connected: false; error: string };
export function NearProofPanel() {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  async function verify() {
    setBusy(true); setResult(null);
    try {
      const response = await fetch("/api/near", { cache: "no-store" });
      const body = await response.json() as Result;
      setResult(response.ok ? body : { connected: false, error: body.connected ? "Verification failed." : body.error });
    } catch { setResult({ connected: false, error: "Network request failed. Try again." }); }
    finally { setBusy(false); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "greed-near-policy-proof.json"; link.click(); URL.revokeObjectURL(url);
  }
  const contract = result?.connected ? result.contract : null;
  return <section className="panel">
    <div className="panel-heading"><h2>NEAR policy proof</h2><span className="pill">Testnet · synthetic inputs</span></div>
    <div className="near-description"><FlaskConical size={24}/><p>Read the deployed policy and its recorded decision from a finalized NEAR block. Treasury settlement and holder governance remain simulated.</p></div>
    {result ? <div className={result.connected ? "near-result positive" : "near-result negative"} role="status">
      {result.connected ? <><b>{contract?.record ? "Policy decision verified on testnet" : "Testnet verified"}</b><span>Block {(contract?.blockHeight || result.blockHeight).toLocaleString()}</span><code>{contract?.blockHash || result.blockHash}</code>{contract ? <><span>{contract.account}</span><span>{contract.codeVerified ? "Deployed code matches the expected build." : "Code hash read; expected build hash is not configured."}</span><code>{contract.codeHash}</code>{contract.record ? <><b className={contract.record.allowed ? "positive" : "negative"}>Recorded decision: {contract.record.allowed ? "Permitted" : "Blocked"}</b><span>Record {contract.recordId} · synthetic allocation</span></> : <span>No proof record selected.</span>}</> : <span>No project policy contract configured.</span>}</> : <><b>Verification unavailable</b><span>{result.error}</span></>}
    </div> : null}
    {contract?.record ? <details className="near-proof-details"><summary>Inspect eight policy checks</summary><div className="policy-checks">{contract.record.checks.map(check => <div className="policy-check" key={check.rule}><div><b>{check.rule}</b></div><span className={`check-status ${check.passed ? "positive" : "negative"}`}>{check.passed ? "Pass" : "Blocked"}</span></div>)}</div><div className="near-result"><span>Input commitment (SHA-256)</span><code>{contract.record.inputHash}</code></div></details> : null}
    <div className="near-proof-actions"><button className="button button-outline" disabled={busy} onClick={verify}>{busy ? "Verifying…" : "Verify testnet"}<ArrowUpRight size={15}/></button>{result?.connected ? <button className="text-link" onClick={download}><Download size={14}/>Export proof</button> : null}</div>
  </section>;
}
