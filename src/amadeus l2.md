# Amadeus Oracle (Agri/IoT) — Architecture & How It Works

## What Amadeus Is
**Amadeus is a verifiable oracle pipeline** designed for **agribusiness + IoT**: it ingests field telemetry or reports (sensor readings, logistics events, batch/lot evidence), generates **zero-knowledge proofs** about validity/compliance rules, aggregates proofs, and publishes a **final settlement commitment** to a blockchain.

- **Not an election system.**
- Think: **“data attestation → prove → verify → aggregate → settle”**.

---

## High-Level Design (2 Layers)

### Layer 1 — Submit & Prove (per report)
Goal: accept a single oracle report, make it verifiable, and store it with a permanent reference.

### Layer 2 — Aggregation & Settlement (batch)
Goal: collect many proven reports, aggregate proofs, and settle a single commitment on-chain.

---

## Components

### UI / Frontend (Next.js)
- **`index.tsx`** — Landing / entry
- **`explore.tsx`** — Login + feed + submit report
- **`dashboard.tsx`** — Stats + **Auditor Mode** (monitor rollup + verify history)

### Backend / Protocol (Rust + services)
- **Server (8080)** — API Gateway + orchestration  
  Responsibilities:
  - receive report JSON
  - pin payload to IPFS
  - request proof generation
  - trigger verification
  - forward to rollup aggregator
  - provide history/status endpoints to UI

- **IPFS / Pinata** — Storage of immutable artifacts  
  Stores:
  - report payloads (raw telemetry / structured report)
  - proofs and/or proof metadata  
  Returns:
  - **CIDs** used as permanent identifiers

- **Prover (8081)** — ZK proof generation (Halo2)  
  Produces:
  - proof object(s) for a report (and public inputs)

- **Robot Verifier (5005/6005)** — ZK verification services  
  Roles:
  - **Single-proof verify** (per report)
  - **Aggregated-proof verify** (for rollup batches)

- **ZK Rollup (8082)** — Aggregation engine  
  Buffers proven reports → builds aggregation → emits:
  - aggregated proof
  - batch commitment/root
  - batch metadata

- **Semaphore (3030)** — Gatekeeper + submitter  
  Submits the batch commitment to the chain and tracks finality.

- **Blockchain settlement (currently Solana)**  
  Stores:
  - final commitment (root hash / batch hash)
  - transaction reference for audit

---

## How It Works (End-to-End)

### 1) Report submission (IoT / Agri event)
1. UI (**Explore**) or an IoT gateway creates a **Report JSON** (example categories):
   - sensor telemetry (temp/humidity/soil)
   - storage/transport event (cold-chain compliance)
   - harvest lot/batch attestation
   - machine runtime / maintenance log
2. Client sends it to the backend:
   - **`POST /me`** = submit oracle report

### 2) Pin to IPFS (data availability)
3. Server pins the report to **IPFS/Pinata** and receives a **CID**.
4. The CID becomes the permanent reference for:
   - audit
   - replication
   - external verification

### 3) Prove (Halo2)
5. Server calls **Prover (8081)** to generate a **ZK proof** about the report.

Typical proof claims (examples that fit agro/IoT without exposing raw data):
- readings are within expected ranges
- device identity is valid (membership/authorization)
- timestamp window is valid
- compliance rule satisfied (e.g., cold-chain never exceeded threshold)

6. Prover returns the proof + public inputs (or public commitment to inputs).

### 4) Verify (single proof)
7. Server sends the proof to **Robot Verifier** for validation.
8. If valid:
   - server stores/pins proof artifacts (optional but recommended)
   - server forwards the “proven report reference” to the rollup

### 5) Aggregate (batch)
9. **ZK Rollup (8082)** buffers many proven report proofs/references.
10. Rollup builds:
   - an aggregated proof
   - a batch commitment/root (representing the set)
11. Rollup sends aggregated proof to **Robot (agg verify)**.

### 6) Settlement (chain finalization)
12. After agg verification passes, Rollup sends batch to **Semaphore (3030)**.
13. Semaphore submits the batch commitment to the blockchain:
   - **Current implementation: Solana**
   - Output: tx hash + finalized root/commitment

### 7) Audit & monitoring (Dashboard / Auditor Mode)
14. `dashboard.tsx` reads:
   - rollup status (buffer size, last batch, last root)
   - recent CIDs (history)
   - settlement tx references
15. An auditor can independently verify:
   - CID content integrity (IPFS)
   - proof validity (Robot verifier or local verifier)
   - batch commitment exists on-chain

---

## Why This Is an Oracle
Because the system is the **verifiable bridge from real-world signals to on-chain commitments**:

- real world: IoT + agribusiness data
- verifiability: ZK proofs (Halo2) + deterministic pipeline
- availability: IPFS/Pinata CIDs
- finality: chain settlement commitment (root hash)

---

## Chain-Agnostic Settlement (Important)
Even if the current batch settlement is implemented on **Solana**, the architecture is **blockchain-agnostic** by design:

- The rollup emits a **generic commitment** (root hash / batch hash).
- Semaphore acts as a **settlement adapter**:
  - Solana today
  - replaceable with an adapter for any chain that can store a commitment and return a final tx reference

**So:**
- “Solana is the current settlement backend.”
- “The protocol is not limited to Solana.”

---

## Ports / Services Map
- **8080** — Server (API Gateway)
- **8081** — Prover (Halo2)
- **8082** — ZK Rollup (Aggregation)
- **5005 / 6005** — Robot Verifiers (single + agg verify)
- **3030** — Semaphore (gatekeeper + submit)
- **IPFS/Pinata** — storage network (CIDs)
- **Blockchain** — settlement layer (currently Solana)

---

## Optional Docs to Make It “Builder/Investor Grade”
Your architecture + “How it works” is covered. If you want full spec completeness, add:

1. **Data Model / Report Schema**
   - exact JSON fields (device_id, ts, payload commitments, segment, ruleset_id, etc.)
2. **Proof Spec**
   - what the circuit proves, public inputs, constraints, what is hidden
3. **API Reference**
   - endpoints + request/response examples + error formats
4. **Threat Model**
   - replay, spoofed device, timestamp games, pinning failures, assumptions
5. **Settlement Adapter Spec**
   - exactly what is written on-chain (commitment format, metadata pointer, indexing)
6. **Deployment / Ops**
   - how to run services, env vars, keys, monitoring
