import Link from "next/link";
export function Mark(){return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 3 35 12v16L20 37 5 28V12L20 3Z" stroke="currentColor" strokeWidth="3"/><path d="m12 16 8-5 8 5M12 24l8 5 8-5v-5h-9" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/></svg>;}
export function Brand(){return <Link href="/" className="gm-brand" aria-label="Greed Machine home"><Mark/><span>greed<span>machine</span></span></Link>;}
