# Amadeus Oracle (Agri/IoT) — Architecture

Amadeus is a verifiable oracle pipeline for agribusiness + IoT: it turns field telemetry/reports into ZK-proven claims, aggregates them into batch commitments, and anchors the final commitment on-chain for audit.

**Non-goal:** not an election system.

## High-Level Design (2 Layers)

### Layer 1 — Ingest & Prove (per report)
Goal: accept a single oracle report, make it verifiable, and store it with a permanent reference.

### Layer 2 — Aggregation & Settlement (batch)
Goal: collect many proven reports, aggregate them into a final batch commitment, and anchor it on-chain.

## Components

### UI / Frontend (Next.js)
- `index.tsx` — landing / entry
- `explore.tsx` — submit report + feed
- `dashboard.tsx` — stats + Auditor Mode (monitor rollup + verify history)

### Server (8080) — API Gateway + Orchestration (Rust)
Responsibilities:
- receive report JSON
- validate + canonicalize payload
- hash claim deterministically
- pin payload to IPFS
- call Prover for proof generation
- send proof to Robot for verification
- forward proven references to Rollup
- provide history/status endpoints to UI

### IPFS / Pinata — Immutable artifact storage
Stores:
- report payloads (raw telemetry / structured report)
- batch artifacts (CID lists + root + metadata)
Optionally:
- proof artifacts / proof metadata

Returns:
- CIDs used as permanent identifiers

### Prover (8081) — ZK proof generation (Halo2)
Produces:
- proof object(s) for a report
- public inputs / commitments

### Robot Verifier (5005/6005) — ZK verification services
Roles:
- single-proof verification (per report)
- aggregated/batch verification (if used)

### ZK Rollup (8082) — Aggregation engine
Buffers proven reports → builds aggregation → emits:
- batch commitment/root
- batch metadata (seq ranges, CID list pointers)
- optional aggregated proof

### Semaphore (3030) — Gatekeeper + settlement submitter
Submits the batch commitment to the chain and tracks finality.

### Blockchain settlement (Solana today)
Stores:
- final commitment (root hash / batch hash)
- transaction reference for audit

## Settlement is Chain-Agnostic
Rollup emits a generic commitment (root/batch hash). Semaphore is a settlement adapter:
- Solana today
- replaceable with any chain that can store a commitment and provide a tx/event reference

## Ports / Services Map
- 8080 — Server (API Gateway)
- 8081 — Prover (Halo2)
- 8082 — ZK Rollup (Aggregation)
- 5005 / 6005 — Robot Verifiers (single + batch)
- 3030 — Semaphore (gatekeeper + submit)
- IPFS/Pinata — storage network (CIDs)
- Blockchain — settlement layer (Solana today)
