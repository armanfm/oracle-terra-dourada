# Amadeus / Terra Dourada Oracle (Agro + IoT)
## HOW IT WORKS

This system is a **deterministic oracle pipeline** designed primarily for **agribusiness (Agro)** and **IoT telemetry**.  
It turns raw sensor readings into **auditable evidence**:

- **Immutable raw data** stored by **CID** (IPFS/Pinata)
- **ZK proof verification** of rules/constraints (without leaking unnecessary data)
- **Batch aggregation (rollup)** producing a final **root**
- **Settlement on Solana** as a public integrity anchor

The goal is simple: anyone can verify **“this happened”** without blind trust in a server.

---

## 1) System Layers (as in the diagrams)

### Layer 1 — Ingest & Prove
**Goal:** transform one IoT reading into a verifiable artifact.

Components:
- **UI / Frontend (Next.js)**: submits readings, shows history and status
- **Server (Rust, 8080)**: protocol gateway + deterministic pipeline
- **IPFS / Pinata**: stores raw payloads by CID
- **Robot (5005/6005)**: ZK verification service (verifier)

### Layer 2 — Aggregation & Settlement
**Goal:** close evidence batches and anchor them on-chain.

Components:
- **ZK Rollup (8082)**: orders events, batches them, emits roots
- *(Optional / shown in diagram)* **Semaphore (3030)**: storage/relay + queue/policy layer
- **Solana Blockchain**: settlement layer (root anchor)

---

## 2) End-to-End Flow (IoT → Proof → Batch → Solana)

### Step A — IoT reading is produced (edge)
1. A sensor measures telemetry (soil moisture, temperature, rainfall, pH, NDVI, etc.).
2. A gateway (mobile app, Raspberry Pi, LoRaWAN gateway, etc.) packages a **claim**:
   - reading value(s) + timestamp  
   - device identifier  
   - minimal context metadata (farm/plot/field/stream)
3. The gateway signs/authenticates the claim to prevent fabricated data injection.

> The oracle does not rely on “perfect sensors”.  
> It relies on **chain-of-custody + deterministic auditability**.

---

### Step B — UI submits to the Rust Server (8080)
4. The UI sends `POST /mel` containing the IoT claim.
5. The Server:
   - validates schema
   - **canonicalizes** the payload (deterministic JSON)
   - computes `claim_hash`
   - pins to IPFS/Pinata → gets `claim_cid`

---

### Step C — ZK verification (Robot)
6. The Server calls the Robot verifier:
   - sends `claim_hash + public_inputs` (and/or proof material)
   - receives `verified = true/false`
7. If verification fails, the claim is rejected/quarantined (still auditable as a rejection).

**What ZK can prove (without exposing raw data):**
- the device is registered/authorized
- timestamp is within an accepted window
- reading is within plausible physical bounds
- reading satisfies a policy/contract rule (e.g., irrigation trigger)
- reading belongs to an authorized zone without revealing precise coordinates

---

### Step D — Submit to Rollup (8082)
8. The Server submits to the rollup:
   - `claim_cid`
   - `claim_hash`
   - proof reference (or proof data)
9. The rollup assigns a deterministic sequence index `seq` and inserts it into the current batch.

---

### Step E — Batch close + root generation
10. When a batch condition is met (time or size):
   - rollup closes the batch
   - computes a `merkle_root` over all `claim_hash` entries
   - produces a **Batch Artifact**: list of CIDs + root + sequence range
   - pins the batch artifact to IPFS → `batch_cid`

---

### Step F — Settlement on Solana
11. The system posts on Solana:
   - `oracle_id`
   - `stream_id`
   - `batch_id`
   - `merkle_root`
   - `batch_cid`
12. Now Solana becomes a public, immutable anchor for batch integrity.

---

## 3) Auditability (why this is an oracle)

An auditor can verify the pipeline end-to-end:

1. From Solana settlement, retrieve `batch_cid` and `merkle_root`
2. Fetch the batch artifact from IPFS using `batch_cid`
3. Inspect all included `claim_cid` entries
4. Fetch any claim by `claim_cid`
5. Recompute `claim_hash` using the canonicalization rules
6. Verify inclusion of `claim_hash` in the batch `merkle_root` (Merkle proof or recompute)
7. Verify the ZK proof (Robot/verifier)
8. Confirm the root matches the one anchored on Solana

No “trust me”. Only “verify it”.

---

## 4) Frontend Pages (Next.js)

### `index.tsx`
- landing / entry
- selects an oracle stream (farm/co-op/region/crop segment)

### `explore.tsx`
- ingestion UI (submit IoT claims)
- stream feed (latest CIDs + verification status)

### `dashboard.tsx` (AUDITOR MODE)
- batch view: root, `batch_cid`, seq range, counts
- device view: event rates, failures, timing windows
- full verification trigger: recompute integrity and surface divergences

---

## 5) APIs (protocol surface)

### Rust Server (8080)
- `POST /mel`  
  **Responsibility:** validate + canonicalize + pin + call Robot + submit to rollup  
  **Returns:** `claim_cid`, `claim_hash`, `verified`, `seq`/`batch_id` (if available)

- `GET /cids?oracle_id&stream_id&from_seq&to_seq`  
  **Responsibility:** paginated history retrieval

- `GET /status`  
  **Responsibility:** pipeline health (Robot ok, queue depth, last batch)

### Robot Verifier (5005/6005)
- `POST /verify`  
  **Responsibility:** deterministic ZK verification → `verified true/false`

### ZK Rollup (8082)
- `POST /submit`  
  **Responsibility:** order, insert into batch, assign `seq`

- `GET /rollup/status`  
  **Responsibility:** current batch and last finalized batch

---

## 6) What is still needed to “close” the protocol

For a complete, contest-ready / production-ready oracle, these must be explicitly defined:

1. **Canonicalization specification**
   - key ordering
   - UTF-8 / Unicode normalization
   - strict rejection of unknown fields

2. **Official hash function**
   - pick one and freeze it in the protocol (e.g., SHA-256 or BLAKE3)

3. **Device identity model**
   - device registration format
   - authentication/signature verification policy (even minimal for MVP)

4. **Exact ZK statement**
   - constraints being proven
   - public inputs definition
   - circuit versioning (immutable identifiers)

5. **Rollup policy**
   - batch close condition (size/time)
   - failure modes (retry/quarantine/reject)

6. **Solana settlement contract**
   - minimal data fields stored on-chain
   - binding between `batch_cid` and `merkle_root`

---

## Blockchain-Agnostic by Design

This oracle is **blockchain-agnostic by design**.

- The core pipeline (ingestion → canonicalization → hashing → IPFS CID → ZK verification → batch root) is **chain-independent**.
- The blockchain is used only as a **final integrity anchor** (settlement), meaning the system can post the same `batch_root` + `batch_cid` to **any chain** that supports immutable data anchoring.

### Current Settlement Implementation
The current batch settlement is implemented on **Solana** (chosen for speed + low cost + ecosystem fit).  
This is an **implementation choice**, not a protocol limitation.

### Portability Requirements (Any Chain)
To support another blockchain, the only required adaptation is a thin settlement adapter that can:
1. publish `oracle_id`, `stream_id`, `batch_id`
2. publish `merkle_root` (or equivalent root commitment)
3. publish `batch_cid` (IPFS reference)
4. expose a transaction/event id for auditors

Everything else remains unchanged.

### Multi-Chain / Dual Anchoring (Optional)
The oracle can optionally **anchor the same batch on multiple chains** (e.g., Solana + another chain) for redundancy and jurisdictional neutrality, without changing the batch format or verification rules.

