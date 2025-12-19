🌍 Terra Dourada — PQC-Rooted Zero-Knowledge Proofs
How Public Inputs Are Cryptographically Anchored

---

## 1. Purpose

This document describes how Terra Dourada derives Zero-Knowledge public inputs from cryptographic origins based on post-quantum signature schemes.

The goal is strictly defined:

Ensure that the public input (Fp) of a Zero-Knowledge proof is cryptographically bound to a real Dilithium signature, rather than being arbitrarily chosen.

This document does not claim post-quantum security for the Zero-Knowledge proof system itself.
It focuses exclusively on cryptographic origin authentication of public inputs.

---

## 2. Core Mechanism

### 2.1 Deterministic Payload Construction

payload = serialize(data) || ":" || timestamp

The payload represents exclusively the event being proven.
Replay resistance is ensured at the payload level via timestamp or nonce.

---

### 2.2 Post-Quantum Signature (Origin Anchor)

signature = Dilithium.Sign(payload)

This step establishes:
- cryptographic origin authentication
- binding to a post-quantum signature scheme
- a non-arbitrary root external to the ZK circuit

The signature is not verified inside the circuit.

---

### 2.3 Compact Cryptographic Commitment

H = SHA256(signature)

This step:
- compresses the large PQC signature into a fixed-size commitment
- preserves cryptographic linkage to the original signature
- enables efficient use as a public input

---

### 2.4 Deterministic Field Mapping

Fp = Field::from_bytes_mod_order(H)

The resulting Fp:
- is deterministic
- is collision-resistant under SHA-256 assumptions
- is mathematically bound to the Dilithium signature
- is compatible with Halo2 circuits

---

### 2.5 Zero-Knowledge Proof

The prover generates a Halo2 proof whose public input is exactly Fp.

The proof:
- does not contain the payload
- does not contain the signature
- proves only mathematical consistency relative to Fp

---

### 2.6 Independent Verification

A verifier:
- reconstructs Fp from the received bytes
- verifies the proof using the expected verifying key
- enforces deterministic circuit identity (DVKF)

No trust is placed in prover-chosen public inputs.

---

## 3. Practical Advantages

Non-arbitrary public inputs:
Public inputs are cryptographically derived from real signatures, not freely chosen by the prover.

Post-quantum origin authentication:
Origin authentication relies on a post-quantum signature scheme, without implying post-quantum security of the ZK system itself.

Efficient ZK integration:
This approach avoids verifying PQC signatures inside the circuit, keeps constraint counts minimal, and preserves compatibility with aggregation and recursion.

Deterministic auditability:
Any auditor can recompute the hash from a known signature, derive the same Fp, and verify the proof deterministically.

---

## 4. Scope and Limits

This architecture:
- does not make Halo2 post-quantum
- does not claim protection against future quantum computers
- does not replace signature verification systems
- does not provide confidentiality guarantees

It strictly guarantees that Zero-Knowledge public inputs are anchored to cryptographically authenticated origins based on post-quantum signature schemes.

---

## 5. Summary

Terra Dourada demonstrates a minimalistic and practical method for deriving Zero-Knowledge public inputs from authenticated cryptographic origins while preserving determinism, auditability, and efficient circuit design.

The focus is on mechanism and correctness, not on claims of absolute security.
