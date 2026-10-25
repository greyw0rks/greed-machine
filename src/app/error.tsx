"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main id="main" className="error-page"><h1>The machine needs a moment.</h1><p>Could not load this view. Try loading it again.</p><button className="gm-button" onClick={reset}>Try again</button> <a className="gm-text-link" href="/">Return home</a></main>;}
