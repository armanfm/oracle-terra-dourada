## Robot = Trust-State Database (Deterministic Trust DB)

In Terra Dourada Oracle, the **Robot** is not just a service that replies “valid / invalid”.
It acts as a **deterministic provenance + integrity database** — a **trust-state database** that records, chains, and allows querying *what was verified*, *by which verifier*, *under which code version*, and *inside which checkpoint*.

This is exactly the layer Amadeus wants when it talks about **verification**, **auditability**, and **AI-ready data**.

---

## Why this is not a typical SQL database

SQL stores “values”. The Robot stores **verifiable proofs and traces**:

- **statement_hash** — what was proven
- **commitment_hash / payload_hash** — deterministic commitment of the event
- **cid (IPFS)** — data availability: retrievable bytes
- **proof_id / receipt_id** — proof/receipt reference
- **verifier_code_hash + version** — verifier identity (code hash/version)
- **timestamp** — when it was verified
- **result** — `valid=true/false` + minimal metadata
- **parent_hash / chain_hash** — history chaining
- **checkpoint_ref** — which rollup/checkpoint included it

So it doesn’t “store data”; it stores **verifiable trust**.

---

## What the Robot provides to Amadeus

### 1) Provenance DB (Provenance Database)
Instead of reprocessing everything to audit an event from “3 days ago”, an auditor/agent queries the Robot:

- “Does this CID correspond to a canonical payload?”
- “Was this commitment proven under verifier vX?”
- “Which checkpoint root included this event?”
- “What is the trust chain up to the root settled on-chain?”

This turns auditing from “recompute the pipeline” into **deterministic receipt queries**.

### 2) Historical anti-poisoning dataset for AI Training
For training (or *verified compute*), the major risk is **data poisoning**.
The Robot enables objective filters:

- Train **only** on entries with `valid=true`
- Restrict by `verifier_code_hash` (approved verifier builds only)
- Restrict by `checkpoint_range` (only ranges finalized on-chain)
- *(Optional)* restrict by signed device/sensor type (if your statement/circuit includes it)

This produces an “AI-ready” dataset with **lineage and mathematical verification**, not social trust.

### 3) Deterministic runtime for agents
If Amadeus requires deterministic agents, agents need deterministic facts.
The Robot becomes a **verifiable source of truth**:

- “Fact A is legitimate because receipt X exists under verifier Y”
- “This dataset slice is safe because it belongs to checkpoint root Z”
- “This root is the latest consolidated rollup state”

Agents don’t “trust the internet”; they trust **receipts + verifier + chain**.

---

## Data model: Receipt Ledger (append-only)

The Robot maintains an **append-only receipt ledger**.
Each receipt references the previous one (hash-chain) to prevent silent rewrites.

**Receipt (conceptual example):**
- `receipt_id`
- `cid`
- `statement_hash`
- `payload_hash`
- `proof_hash`
- `verifier_code_hash`
- `verifier_version`
- `valid`
- `ts`
- `prev_receipt_hash`
- `receipt_chain_hash`
- `checkpoint_id` (when aggregated)
- `checkpoint_root` (when confirmed)

This gives you:
- **practical immutability** (chained history)
- **auditable replay** (anyone can validate the trail)
- **portability** (the ledger can be replicated across nodes)

---

## Queries the Robot enables (the “DB” in practice)

Without relying on the UI, the Robot can serve objective answers:

- **GetReceipt(receipt_id)** → returns the full receipt
- **GetByCID(cid)** → which receipt validated this CID
- **GetByStatement(statement_hash)** → proof/result for a given statement
- **GetLatestTrustState()** → latest verified root + verifier version
- **GetRange(from, to)** → receipts in an interval (for audits)
- **GetCheckpoint(checkpoint_id)** → root, range, aggregated proof, status
- **VerifyDeterministically(payload/cid)** → yes/no + receipt (if it exists)

This turns the Robot into a **trust index** — not just a “verification endpoint”.

---

## How it fits with Rollup + Settlement

- The Robot verifies individual events and produces receipts
- The Rollup aggregates receipts → `checkpoint_root`
- Robot2 verifies the checkpoint and maintains the **aggregated trust state**
- The chain (Solana today) stores **only the root + minimal metadata**

Result:
- heavy data stays on IPFS (**data availability**)
- trust lives in receipts/rollups (**verification**)
- the chain is the **finalization anchor** (cheap + auditable)

---

## Why this wins hackathons

Most projects pitch “AI that does things”.
This builds what’s missing: **infrastructure that makes AI trustworthy**:

- auditable data (provenance)
- verifiable integrity (ZK)
- queryable history (Trust-State DB)
- safe training (anti-poisoning)
- cheap finalization (root on-chain)

**In one sentence:** the Robot is the layer that turns “real-world events” into **verifiable knowledge**.
