# Amadeus / Terra Dourada Oracle (Agro + IoT) — Protocol (How It Works)

Deterministic oracle pipeline for agro + IoT telemetry: stores raw evidence by **CID (IPFS)**, proves constraints with **ZK**, aggregates batches into a **Merkle root**, and anchors the root on-chain (**Solana today**) so anyone can verify “this happened” without trusting a server.

**Non-goal:** not an election system.

## 1) End-to-End Flow (IoT → IPFS → Prove → Verify → Batch → Solana)

### Step A — IoT claim produced (edge)
A sensor/gateway packages a claim:
- reading value(s) + timestamp
- device identifier
- minimal metadata (farm/plot/field/stream/segment)

Gateway authenticates/signs the claim to prevent fabricated injection. The oracle does not rely on “perfect sensors”; it relies on chain-of-custody + deterministic auditability.

### Step B — Submit to Server (8080)
Client calls `POST /me` with the claim JSON. Server:
- validates schema
- canonicalizes payload (deterministic JSON)
- computes `claim_hash` (freeze hash function in the protocol, e.g., SHA-256)
- pins payload to IPFS/Pinata → `claim_cid`

### Step C — Prove + Verify
- **Prover (8081)** generates a ZK proof under a `ruleset_id` (policy/circuit version).
- **Robot Verifier (5005)** verifies deterministically → `verified=true/false`.

If verification fails: claim is rejected/quarantined (still auditable as a rejection).

Examples of ZK statements (without leaking raw data):
- device is registered/authorized
- timestamp is within accepted window
- reading is within plausible physical bounds
- reading satisfies a policy/contract rule (e.g., cold-chain never exceeded threshold)
- reading belongs to authorized zone without revealing precise coordinates

### Step D — Submit to Rollup (8082)
Server submits to rollup:
- `claim_cid`
- `claim_hash`
- proof reference (or proof bytes + public inputs)

Rollup assigns deterministic sequence `seq` and inserts it into the current batch.

### Step E — Batch close + root generation
When a batch condition is met (time or size):
- rollup closes the batch
- computes `merkle_root` over ordered `claim_hash` entries
- builds a **Batch Artifact**: list of CIDs + root + seq range + metadata
- pins the batch artifact to IPFS → `batch_cid`

Optional:
- Robot (6005) verifies an aggregated proof if you aggregate proofs; otherwise keep batch integrity as Merkle commitment + per-claim proofs.

### Step F — Settlement on Solana (integrity anchor)
Semaphore (3030) submits on-chain:
- `oracle_id`, `stream_id`, `batch_id`
- `merkle_root`
- `batch_cid`

Output: `tx_hash` (finality reference).

## 2) Auditability (No trust. Verify it.)
An auditor can verify end-to-end:
1) from Solana settlement, read `batch_cid` + `merkle_root`
2) fetch batch artifact from IPFS via `batch_cid`
3) fetch any claim via `claim_cid`
4) recompute `claim_hash` using canonicalization rules
5) verify inclusion of `claim_hash` in `merkle_root` (Merkle proof or recompute)
6) verify the ZK proof (Robot or local verifier)
7) confirm root equals the one anchored on Solana

## 3) APIs (protocol surface)

### Server (8080)
- `POST /me`
  - validate + canonicalize + hash + IPFS pin + prove + verify + rollup submit
  - returns: `claim_cid`, `claim_hash`, `verified`, `seq`/`batch_id` (if available)
- `GET /cids?oracle_id&stream_id&from_seq&to_seq`
  - paginated history retrieval
- `GET /status`
  - pipeline health (Prover ok, Robot ok, queue depth, last batch)

### Robot Verifier (5005/6005)
- `POST /verify`
  - deterministic verification → `verified=true/false`

### ZK Rollup (8082)
- `POST /submit`
  - order, insert into batch, assign `seq`
- `GET /rollup/status`
  - current batch and last finalized batch

## 4) What must be frozen to “close” the protocol
- Canonicalization specification (key ordering, UTF-8/Unicode normalization, reject unknown fields)
- Official hash function (pick one and freeze, e.g., SHA-256 or BLAKE3)
- Device identity model (registration format + authentication/signature policy)
- Exact ZK statement (constraints, public inputs, circuit versioning)
- Rollup policy (batch close condition size/time, retry/quarantine/reject)
- Solana settlement contract/spec (fields stored on-chain + binding between `batch_cid` and `merkle_root`)

## 5) Blockchain-Agnostic by Design
Core pipeline is chain-independent; blockchain is only an integrity anchor. Porting requires a thin settlement adapter that can:
- publish `oracle_id, stream_id, batch_id`
- publish `merkle_root` (or equivalent commitment)
- publish `batch_cid` (IPFS reference)
- expose a transaction/event id for auditors

Optional: dual anchoring on multiple chains without changing batch format or verification rules.
