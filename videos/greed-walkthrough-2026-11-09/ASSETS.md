# Asset provenance

Product footage was captured November 9, 2026 (Africa/Lagos), from the actual app using an isolated temporary SQLite ledger. Raw recordings remain local. Processed clips and edit-manifest.json preserve the edit decisions, including the shortened 18.571-second RPC wait.

The read-only observation in assets/live-verification-response.json is from finalized NEAR testnet block 276844141. It reconciles 1,004.55 gUSD treasury, 8.45 paid and zero liabilities. No transaction was signed or replayed for this video.

The user selected ElevenLabs and an available natural narrator. Eight River takes were generated with eleven_multilingual_v2 at normal speed. Native character alignment is preserved with the media and drives sentence captions. Credentials are read at generation time, never stored in this project. Private voice references and the earlier KittenTTS takes are excluded from this published source.

Geist and the local GSAP runtime are reused from the existing project; see the repository third-party notices and Geist OFL. The source uses no remote media during rendering. Voice only follows the existing audio direction.

The capture manifest’s `start` field records preparation wall time; it is not a source-video seek offset. The explicit `edit.start`/segment offsets in assets/clips/edit-manifest.json are the reviewed frame selections.
