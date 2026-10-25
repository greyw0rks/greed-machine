import Link from "next/link";
export function Mark({ small = false }: { small?: boolean }) {
  return <Link href="/" className={`brand ${small ? "brand-small" : ""}`} aria-label="Greed Machine home"><span className="brand-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M18.5 7a8 8 0 1 0 .5 10v-5h-7v4h3a4 4 0 1 1 0-8" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" /></svg></span><span>greed<span className="brand-light">machine</span></span></Link>;
}
