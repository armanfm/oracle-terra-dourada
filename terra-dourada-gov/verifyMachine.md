## Circuit Hash Commitment and Verification Flow

Terra Dourada binds zero-knowledge proofs to **explicit, authorized circuit identity**.
This ensures that proofs are not only correct, but correct **for the intended and approved computation**.

---

## 1. Circuit Hash Generation

At build time, the verifier derives a deterministic hash representing the circuit identity.
This hash may be derived from:

- the Verifying Key (canonical identity), or
- a deterministic circuit fingerprint

This hash represents **intent**, not execution.

---

## 2. PQC Signature and Commitment

The circuit hash is then:

- signed using a **post-quantum cryptographic (PQC) signature**
- converted into a fixed, canonical fingerprint (FP)

This signed fingerprint represents an **authorized circuit commitment**.

---

## 3. World Bin Ledger (Global Commitment Store)

The signed fingerprint is published to a global append-only ledger called **World Bin**.

Properties of World Bin:

- append-only
- content-addressed
- immutable once committed
- independent from proof generation
- globally auditable

World Bin acts as the **single source of truth** for authorized circuit identities.

---

## 4. Robot Memory Model

The Terra Dourada Verification Robot maintains a local, deterministic memory snapshot
synchronized from World Bin.

This memory contains:

- authorized circuit fingerprints
- their corresponding PQC signatures
- historical lineage (optional)

The robot does not infer trust.
It checks membership.

---

## 5. Proof Submission and Verification

When a prover submits a zero-knowledge proof:

1. The proof exposes (or is verified against) a **public circuit identity**
2. The robot extracts or derives the circuit hash
3. The robot checks whether this hash exists in its World Bin–backed memory
4. If the hash is present and authorized:
   - the proof is accepted
5. If the hash is missing or unauthorized:
   - the proof is rejected, regardless of cryptographic validity

---

## 6. Security Properties

This model guarantees:

- Proof correctness (via ZK)
- Circuit intent integrity (via hash binding)
- Post-quantum authorization (via PQC signatures)
- No silent circuit evolution
- No reliance on trusted operators
- No need for behavioral STARK proofs in the PoC

A proof can be valid for the wrong circuit.
A circuit hash cannot lie about intent.

---

## 7. Design Principle

Zero-knowledge proves **that** a computation is correct.  
Circuit identity proves **what** computation was intended.

Terra Dourada enforces both.
