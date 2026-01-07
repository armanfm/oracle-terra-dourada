# Terra Dourada — Verified Truth Pipeline

Terra Dourada is a sovereign verification pipeline that finalizes real-world events locally
and publishes immutable commitments for global coordination.

---

## Architecture Overview

The system is composed of two independent services:

### 1) Local Sovereign Verifier (`backend.rs`)

Runs locally and is responsible for:
- Receiving raw events
- Generating PQC + HMAC integrity
- Requesting ZK proofs
- Validating prover responses
- Publishing full artifacts to IPFS (Pinata)
- Emitting a cryptographic commitment (proof hash)

This service is the **only place where truth is decided**.

---

### 2) Global Coordination Agent (`info_global.rs`)

Runs as an independent global agent and:
- Receives only proof commitments (hash + optional metadata)
- Appends them to a global append-only ledger
- Rebuilds deterministic training input
- Trains a global agent state (`global_mind.bin`)
- Produces a versioned global fingerprint (FP)

The global agent never sees raw data or proofs — only immutable references.

---

## Integration with Amadeus

Terra Dourada integrates with Amadeus as a verified truth source.
Local sovereign verification finalizes events and publishes commitments (hash + CID).
These commitments can be consumed by Amadeus agents or on-chain logic for coordination and settlement.
No WASM execution is implemented in this submission.
