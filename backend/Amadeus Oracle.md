# Amadeus Oracle — Architecture & Protocol (v0.1)

Amadeus is a **deterministic oracle pipeline** designed for **agribusiness + IoT**: it ingests field events (sensor readings, operator attestations, machine telemetry), anchors the raw payload in **content-addressed storage (IPFS/Pinata)**, generates **ZK proofs (Halo2)** about validity/integrity, and periodically **aggregates + settles** a compact commitment (root hash) to a blockchain.

> Notes about naming: your current diagrams still show `/mel` and some “vote” labels. In this document, those mean **measurement/attestation** (oracle events), not politics.

---

## 1) What the system guarantees

For each oracle event:

- **Immutability of raw data**: the payload is stored by CID (IPFS).
- **Integrity**: a MAC and/or PQC signature binds the payload to a device/identity.
- **Verifiability**: a ZK proof attests “this event is valid under the rules” without leaking secrets.
- **Scalability**: events are aggregated into rollups; only a **root** is settled on-chain.
- **Auditability**: a dashboard can replay CIDs + verify proofs + track rollup status.

---

## 2) Components (matching your diagrams)

### UI / Frontend (Next.js)
Pages:
- `index.tsx`: landing / entry
- `explore.tsx`: login + feed of oracle events + submit new event
- `dashboard.tsx`: user stats + **AUDITOR MODE** (monitor rollup + verification health)

Frontend actions:
- Submit event → API Gateway
- Fetch history (CIDs) → API Gateway
- Monitor/audit rollup status → ZK Rollup service

---

### Backend / Protocol (Rust)

#### A) API Gateway — `Server (8080)`
Role:
- Receives JSON oracle events on `POST /mel`
- Validates schema + rate limits + basic checks
- Creates integrity material:
  - **MAC** (HMAC or equivalent)
  - optional **PQC signature** support (device-side or gateway-side policy)
- Pins payload to IPFS/Pinata (stores/returns CID)
- Dispatches to Prover + Rollup pipeline
- Provides history endpoint (“Fetch CIDs”)

Diagram labels:
- “API Gateway /mel”
- “Fetch CIDs (History)”
- “Pin to IPFS / Pinata”

---

#### B) IPFS / Pinata (Storage)
Role:
- Stores raw oracle payloads as content-addressed objects
- Provides the CID used by verifiers/auditors

Your flow:
- Gateway uploads/pins payload → Pinata → CID returned

---

#### C) Prover — `Prover (8081)` (Halo2)
Role:
- Produces a Halo2 proof for each event (or batch of events)
- Sends proof to verifier service (“Robot1”)
- Forwards proof artifacts to the rollup buffer

In the diagram:
- “Halo2 Proof / prove”
- “Send Proof”

---

#### D) Verifier services — `Robot (5005/6005)`
Role:
- Stateless proof verification services
- Two lanes in your first diagram:
  - `Robot1 (5005)` for **per-event** verification
  - `Robot2 (6005)` for **aggregate** verification (rollup proof)

In your second diagram it’s grouped as:
- “Robot (5005/6005) — ZK Verification”

---

#### E) Rollup / Aggregator — `ZK Rollup (8082)`
Role:
- Buffers verified events/proofs
- Produces aggregated commitments (batch root)
- Optionally generates an **aggregation proof**
- Exposes status for the dashboard (“Aggregator Status”)

In the diagram:
- “Buffer + Agg / aggregate”
- “Monitor/Audit (Aggregator Status)”

---

#### F) Identity / batching gateway — `Semaphore (3030)` (optional but in your diagram)
Role (as shown):
- Receives batch roots / proofs (or metadata)
- Handles identity gating / membership / submission rules
- Feeds settlement layer

---

#### G) Settlement chain (currently Solana in your diagram)
Role:
- Stores only a small, cheap commitment:
  - root hash (and possibly a proof pointer / CID)
- Acts as the public timestamped anchor

---

## 3) Data objects

### 3.1 Oracle Event Payload (stored in IPFS)
A typical agribusiness IoT event should include:

- `event_id`: deterministic ID (hash of normalized payload)
- `device_id`: sensor or machine identity
- `farm_id` / `plot_id`: location scope (can be coarse)
- `ts`: timestamp (ISO or unix)
- `type`: e.g., `soil_moisture`, `temperature`, `grain_silo_weight`, `sprayer_activity`
- `data`: typed measurement(s)
- `nonce`: anti-replay value
- `meta`: firmware version, calibration ref, etc.

**Stored object = canonical JSON** (or CBOR) so hashing is stable.

---

### 3.2 Integrity material (MAC + PQC)
Two layers (your diagram explicitly shows both MAC + PQC):

- **MAC**: fast integrity/auth for ingestion (shared secret per device or per tenant)
- **PQC signature**: stronger public verifiability (device signs payload; gateway only relays)

Recommended binding rule:
- MAC and/or signature must cover:
  - canonical payload bytes
  - timestamp
  - nonce
  - device_id

---

### 3.3 Proof artifact (Halo2)
A proof is generated over a statement like:

> “I know a payload `P` and integrity material such that:
> 1) `CID = hash(P)` (or the multihash equivalent),
> 2) MAC verifies for `P` under the device key,
> 3) (optional) PQC signature verifies for `P` under device public key,
> 4) `ts` is within acceptable bounds,
> 5) `P` respects domain rules (ranges, calibration, monotonic constraints, etc.).”

The proof output is stored or referenced (you can store the proof itself in IPFS too, and only keep a CID pointer).

---

## 4) End-to-end flows (what your diagrams show)

### Flow A — Submit Oracle Event (single event)
1. **UI (`explore.tsx`) → `POST /mel`** with JSON event
2. **Gateway (8080)** canonicalizes payload, computes MAC, checks basic validity
3. **Gateway → Pinata/IPFS** uploads payload → returns **CID**
4. **Gateway → Prover (8081)** requests Halo2 proof for `{CID, rules, integrity}`
5. **Prover → Robot (5005)** verifies the proof (or Robot verifies after proof generation)
6. **Gateway/Prover → Rollup (8082)** sends `{CID, proof_ref, event_id}`
7. **UI** fetches status/history (CIDs) from Gateway

Outputs:
- CID for payload
- proof verified status
- event visible in history/feed

---

### Flow B — Aggregation + Settlement (batch)
1. **Rollup (8082)** collects verified events into a batch
2. **Rollup** computes **batch root** (Merkle root or hash chain)
3. **Robot2 (6005)** verifies aggregation proof (if used)
4. **Semaphore (3030)** receives batch material (root + proof refs)
5. **Blockchain settlement** stores the root hash (and optionally a CID pointer)

Outputs:
- On-chain root commitment
- batch metadata for auditors

---

### Flow C — Audit mode (dashboard)
1. `dashboard.tsx` queries rollup status (8082)
2. It can fetch a batch root + included event CIDs
3. Auditor re-downloads payloads by CID from IPFS
4. Auditor verifies:
   - payload hash matches CID
   - proof verifies (Robot service or local verifier)
   - event is included in a settled batch root

---

## 5) Blockchain-agnostic design (YES, put this in the doc)

Even if the current batch settlement is on **Solana**, the system is **not limited** to it.

### Keep the core chain-neutral
- The rollup produces a **root hash** (plus optional proof reference).
- Settlement is simply: `publish(root, batch_id, timestamp, proof_ref)`.

### Chain adapter pattern
Implement a small “settler” module per chain:

- `settle(root, meta) -> tx_hash`
- `get_settlement(tx_hash) -> confirmed/root`
- `verify_settlement(root) -> proof_of_inclusion`

This lets you swap:
- Solana
- Ethereum / L2
- Cosmos chains
- any chain that can store a small commitment

The cryptographic truth stays in:
- IPFS CIDs (data)
- ZK proofs (validity)
- rollup root (compression)

---

## 6) What the “HOW (Amadeus)” must contain (your missing piece)

If you want a clean “How to use it” section, include **exactly this structure**:

### 6.1 Run order (local / dev)
- Start `pinning` config (Pinata)
- Start `server:8080`
- Start `prover:8081`
- Start `robot:5005` and `robot:6005`
- Start `rollup:8082`
- (Optional) start `semaphore:3030`
- Start frontend (Next.js)

### 6.2 API contract (minimum)
Document these routes (names based on your diagram):

- `POST /mel` — submit oracle event
- `GET /mel/history` — list recent CIDs (feed)
- `GET /rollup/status` — aggregator health + last root + batch size
- `GET /rollup/batch/{batch_id}` — batch root + included event IDs/CIDs
- `POST /rollup/aggregate` — force batch aggregation (admin)
- `POST /verify/proof` — verify single proof (Robot)
- `POST /verify/aggregate` — verify aggregation proof (Robot)

### 6.3 Expected responses
For each route, show:
- success shape
- failure shape
- what is deterministic (IDs, hashing, canonicalization rules)

### 6.4 Audit recipe (step-by-step)
- Take a settled root
- Get batch events
- Fetch payloads by CID
- Verify CID hashing
- Verify proof
- Verify inclusion in root

That’s the “HOW” people will actually follow.

---

## 7) Security model (short but mandatory)

### Threats handled
- Payload tampering (CID + proof fails)
- Replay attacks (nonce + ts constraints)
- Fake device submissions (MAC/PQC required)
- Batch manipulation (root settlement + inclusion checks)

### Trust assumptions (state them clearly)
- Pinata/IPFS availability is not a trust anchor (integrity is by CID)
- The verifier (Robot) can be replicated; proofs are publicly checkable
- The chain is only used as a timestamped commitment store

---

## 8) What documentation is still missing (checklist)

With your diagrams + this spec, the **only remaining docs** you might still need are:

1. **Canonicalization rules** (exact JSON normalization so hashes are stable)
2. **Circuit spec** (precise Halo2 statement + constraints)
3. **Key management** (device keys, rotation, revocation)
4. **Rollup math** (how roots are computed, inclusion proof format)
5. **Chain adapter spec** (fields written on-chain + how to read them)
6. **Operational runbook** (logs, metrics, failure recovery)
7. **IoT onboarding guide** (how a sensor is provisioned + identity enrollment)

---

## 9) One-line system summary (useful for README)
Amadeus is a deterministic IoT oracle pipeline that anchors agribusiness events to IPFS, proves validity with Halo2 ZK proofs, aggregates batches via a rollup, and settles only root commitments on-chain (currently Solana, chain-agnostic by design).
