## Terra Dourada — Local Ledger, Global Reflection & WASM Roadmap

### What Exists Today (Implemented)

Terra Dourada currently operates with **local factual sovereignty**.

The implemented flow is:

1. A proof is generated (SNARK).
2. The Robot verifies the proof (valid / invalid).
3. **Only validated facts** are written to a **local append-only ledger**.
4. The ledger is canonicalized into deterministic binary artifacts:
   - `TERRAMIN`
   - `mind.bin`
5. Fractal GPT / Brands consume **only these binaries**.
6. Amadeus consumes Terra Dourada as a **truth substrate**, not as a verifier.

Key properties:
- No unvalidated data is stored.
- No negative facts exist.
- Absence of a record means “unknown”.
- Deterministic, auditable, hallucination-resistant.

This system is **already functional**.

---

### Roadmap: Global Deterministic Ledger (WASM Reflection)

As a future extension, Terra Dourada introduces the concept of a **Global Deterministic Ledger**, executed via **WASM on Amadeus nodes**.

This is **not a replacement** for the local ledger.

It is a **reflection layer**.

#### Core Idea

- Each Terra Dourada instance remains sovereign.
- Each instance continues to produce its **own local ledger and binaries**.
- Periodically, a **compact commitment** derived from the local binary
  (hash / checksum / header digest) is emitted to a **Global WASM Ledger**.

No raw data.
No proofs.
No interpretation.

Only deterministic commitments.

---

### Local vs Global Responsibilities

**Local Ledger (Implemented):**
- Stores validated facts.
- Builds `mind.bin` / `TERRAMIN`.
- Serves Fractal GPT, Brands, and local agents.
- Full factual detail lives here.

**Global Ledger (Roadmap):**
- Executed as a deterministic WASM runtime on Amadeus.
- Stores only:
  - snapshot hash
  - version
  - timestamp
  - instance identifier
- No facts, no proofs, no semantics.

This preserves:
- Privacy
- Low cost
- Determinism
- Scalability

---

### How This Serves the Global Robot

The **Global Robot** does NOT re-verify proofs.

Instead, it:

1. Observes global ledger entries (WASM-executed).
2. Verifies deterministic integrity:
   - hash consistency
   - version compatibility
   - ordering
3. Treats each committed snapshot as:
   > “This factual state exists and was finalized by a Terra Dourada instance.”

The Global Robot becomes a **trust-state coordinator**, not a verifier.

Local Robots decide truth.  
Global Robot coordinates **which truths exist where**.

---

### Binary Independence (Critical Property)

- Local binaries are **never uploaded wholesale**.
- Global ledger entries are **independent artifacts**.
- Each layer can evolve independently.

Local:
- Rich, factual, domain-specific

Global:
- Minimal, neutral, coordination-only

---

### Why This Is a Roadmap (Not Claimed as Done)

This WASM-based global reflection is:

- Architecturally sound
- Aligned with Amadeus runtime primitives
- Economically viable
- Fully compatible with the current system

However:
- It is **not required** for Terra Dourada to function.
- It is **not claimed as implemented**.
- It is presented as a **future evolution**.

---

### One-Line Summary

Terra Dourada establishes factual truth locally;  
WASM enables global coordination of that truth — without centralization,
re-verification, or loss of sovereignty.
