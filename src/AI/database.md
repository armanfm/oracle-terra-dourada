# Terra Dourada — Ledger, Fractal Memory and Validation Semantics

This document describes **exactly what is stored**, **when it is stored**, and **who is allowed to store it** in the Terra Dourada architecture.

There is no ambiguity in this flow.

---

## Core Rule (Non-Negotiable)

> **Only validated facts enter the ledger.**  
> Everything else leaves no trace.

---

## End-to-End Flow (Authoritative)

### 1. Proof Generation
- The **Prover** generates a cryptographic proof (SNARK).
- The proof may be large (“giant proof”).

---

### 2. Verification (Robot / Oracle)

- The **Robot** receives the full proof (RAW bytes).
- The Robot:
  - validates the verifying key (VK)
  - verifies the SNARK
  - applies deterministic rules
- The Robot returns **only a boolean result**:
  - `success = true`
  - `success = false`

The Robot:
- does **not** return the proof
- does **not** return hashes
- does **not** persist data
- does **not** interpret meaning

It only decides **valid or invalid**.

---

### 3. Invalid Proof Semantics

If the proof is **invalid**:

- The Robot returns `success = false`
- The Prover discards the proof
- The Server receives **no proof**
- Nothing is written to the ledger
- Nothing is written to Fractal memory
- Nothing is written to binary artifacts

**Result:**  
There is **no record**.  
The state is **unknown**.

Invalid proofs leave **no factual trace**.

---

### 4. Valid Proof Semantics

If the proof is **valid**:

- The Robot returns `success = true`
- The Prover returns the proof to the Server
- The Server may:
  - publish the proof externally (e.g. IPFS / Pinata) for audit
  - compute hashes or identifiers
  - generate a verification receipt

Only at this point does data become eligible for persistence.

---

## Ledger Responsibilities (Server-Side)

The **Server** is responsible for persistence.

It writes **only validated facts** into an append-only ledger (e.g. `.txt`, log file).

### Mandatory Constraint
- ❗ The Server **must never** write anything that was not validated by the Robot.

---

## What the Ledger May Store

After validation, the ledger may store **any metadata the system considers useful**, for example:

- `proof_hash`
- `name / label`
- `urn_id`
- `timestamp`
- `verifier_code_hash`
- `verifier_version`
- `domain` (brands, oracle, vote, etc.)
- `source`
- human-readable tags

These fields are:
- **indexing**
- **labeling**
- **organization**

They do **not** create truth.  
Truth already exists because validation happened.

---

## What the Ledger Must NOT Store

To preserve determinism and anti-hallucination guarantees:

- ❌ unvalidated data
- ❌ inferred meaning
- ❌ probabilistic judgments
- ❌ negative facts (“this is false”)
- ❌ failed attempts
- ❌ interpretations

Absence of a record is sufficient to represent non-existence.

---

## Ledger → Binary Consolidation

- The append-only ledger is periodically:
  - canonicalized
  - consolidated
  - converted into deterministic binary artifacts

Examples:
- `TERRAMIN`
- `mind.bin`

These binaries represent **sovereign factual memory**.

---

## Fractal GPT / Robot Brands Behavior

- Fractal GPT and Robot Brands:
  - do **not** talk to the Prover
  - do **not** talk to IPFS
  - do **not** talk to the Oracle
- They **only read the binary artifacts**

Semantics:
- Entry exists → fact exists
- Entry does not exist → unknown
- There is no “invalid fact” state

---

## Separation of Responsibilities (Final)

- **Robot**  
  Verifies proofs. Decides validity.

- **Prover**  
  Generates proofs. Never writes facts.

- **Server**  
  Persists validated facts. Builds ledger.

- **Ledger**  
  Append-only factual record.

- **Binary (TERRAMIN / mind.bin)**  
  Deterministic memory snapshot.

- **Fractal GPT / Brands**  
  Read-only consumers of factual memory.

---

## Final Principle

> **The Robot decides what is true.  
> The Server decides how to store it.  
> The Ledger remembers it.  
> The Fractal only recalls it.**

This architecture is deterministic, auditable, scalable, and hallucination-resistant by design.

.
