# Security Properties by Construction

Terra Dourada enforces integrity, finality, and auditability **at the moment an event is created**, not after coordination, aggregation, or consensus.

As a result, entire classes of attacks common in distributed systems are eliminated **by construction**, not by policy, monitoring, or incentives.

Security is applied **before propagation**, not after.

---

## Core Principle

> An event must be cryptographically sealed and persistently recorded **before it can be transmitted, delayed, reordered, or censored**.

In Terra Dourada:
- Events are finalized locally at creation time.
- Coordination, aggregation, and on-chain anchoring are **consequences**, not prerequisites.
- No event depends on network availability, batch windows, or consensus rounds to exist as a fact.

---

## Eliminated Attack Classes

### Event Reordering

**Property:** Reordering is structurally impossible.

**Reason:**  
The event hash and its derived fingerprint (FP) are recorded in a local append-only ledger **before any transmission occurs**.

Once sealed locally, the event’s position in history cannot be altered by intermediaries, sequencers, or aggregators.

---

### Censorship and Selective Omission

**Property:** Censorship does not invalidate facts.

**Reason:**  
Events are persisted locally at creation time.  
Even if transmission is blocked, delayed, or refused, the event already exists as a sealed record.

Network failure or operator refusal cannot erase or suppress the existence of an event.

---

### Delay via Aggregation Windows

**Property:** No aggregation delay exists.

**Reason:**  
Terra Dourada does not rely on batching, rollup windows, sequencer publication, or consensus finality for event validity.

An event is final **immediately upon local sealing**, not after aggregation.

---

### Replay and Injection Attacks

**Property:** Replay and injection are rejected deterministically.

**Reason:**  
The Robot verifies that:
- `hash(FP)` exists in the local ledger
- `hash(HMAC)` exists in the local ledger
- the post-quantum signature is valid

Any event, proof, or message not pre-registered locally is discarded.

---

### Proof Substitution

**Property:** Proof substitution is impossible.

**Reason:**  
The Robot validates that the proof corresponds exactly to:
- the pre-registered fingerprint (FP)
- the associated HMAC
- the original post-quantum signature

A valid proof for a different event cannot be reused or swapped.

---

## Anti-Aggregation Integrity Model

Most distributed systems finalize data **after** aggregation phases such as:
- batching
- sequencing
- consensus
- synchronization

These phases introduce a temporal attack surface where data is not yet final.

Terra Dourada removes this surface entirely by enforcing:
- local cryptographic sealing
- append-only ledger insertion
- deterministic timestamping

Finality is intrinsic to event creation, not achieved later.

---

## Offline-First Operation

Terra Dourada operates in an **offline-first** mode.

Even without network connectivity, the system allows:
- event registration
- cryptographic hashing
- ledger chaining
- persistent local storage

Transmission, coordination, and anchoring can occur later without compromising integrity.

No external service is required for an event to exist as a verifiable fact.

---

## Deterministic State Reconstruction (`mind.bin`)

Local and global ledgers are transformed via deterministic reconstruction into binary memory artifacts:

- `mind.bin` (local state)
- `global_mind.bin` (global state)

This process is:
- reproducible
- auditable
- deterministic
- independent of execution environment

Agents consume these states in read-only mode.  
No probabilistic inference or hidden learning occurs.

---

## Summary

Terra Dourada does not mitigate attacks through monitoring or consensus.

It **eliminates attack surfaces by design**:

- No reorder window  
- No censorship window  
- No aggregation delay  
- No replay or injection  
- No proof substitution  

Integrity is enforced **before coordination**.

That is the security model.
