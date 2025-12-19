# Deterministic Circuit Fingerprinting (DCF)

Deterministic Circuit Fingerprinting (DCF) defines a **verifiable, deterministic identity**
for zero-knowledge circuits, independent of witnesses and proofs.

It establishes a strict separation between **circuit intent** and **proof execution**.

---

## 1. Circuit Identity Layers

### 1.1 Structural Circuit Fingerprint (Configuration-Level)

The structural fingerprint is computed by deterministically hashing and concatenating
all semantic and structural markers that define a circuit’s intent.

**Purpose:**
- Detect semantic changes
- Enable early auditing
- Support circuit evolution tracking
- Debug circuit identity mismatches
- Operate even before Verifying Key generation

**Limitation:**
This layer reflects **semantic structure**, not the compiled cryptographic object.

It is intended for observability and governance, not final cryptographic authority.

---

### 1.2 Verifying Key Fingerprint (Canonical Identity)

The Verifying Key (VK) is the canonical cryptographic compilation of a circuit.

**Properties:**
- Deterministic
- Independent of witness data
- Identical across platforms for the same circuit
- Changes on any semantic modification

**Therefore:**

> **The hash of the Verifying Key is the cryptographic identity of the circuit.**

This is the strongest and final fingerprint.

---

## 2. Why Proofs Are Not Fingerprinted

A frequent misconception is:

> *“Can individual proofs be fingerprinted or compared?”*

**No — and they must not be.**

**Reasons:**
- Proofs are randomized by design
- Proofs differ on every execution
- Fingerprinting proofs would break zero-knowledge guarantees
- Proofs do not encode semantic intent

| Object   | Carries Intent |
|---------|----------------|
| Circuit | ✅ Yes |
| VK      | ✅ Yes |
| Proof   | ❌ No |
| Witness | ❌ No |

DCF operates **above proofs**, not inside them.

---

## 3. Operational Model

### Aggregator / Verifier Flow

- The aggregator knows the expected circuit fingerprint
- The prover submits:
  - a zero-knowledge proof
  - optionally, the circuit fingerprint or VK hash
- The aggregator verifies:
  - proof validity (cryptographic correctness)
  - fingerprint equality (circuit identity)

**If fingerprints mismatch, the proof is rejected — regardless of proof validity.**

This ensures that correctness is always bound to **authorized circuit intent**.

---

## 4. Equality vs Similarity

DCF supports two distinct modes with **strict separation of purpose**.

### 🔒 Strict Mode (Production)

- Exact fingerprint match
- Binary decision (accept / reject)
- Full integrity guarantee
- Used for authorization and enforcement

### 🔬 Similarity Mode (Audit / Research)

- Bit-level similarity metrics
- Used exclusively for:
  - circuit evolution tracking
  - regression analysis
  - semantic drift observation
  - debugging and research tooling

**Important:**
Similarity is never used for security decisions.
Only equality is authoritative.

---

## 5. Security Properties

DCF provides the following guarantees:

- ✅ Proof-of-Origin (circuit-level)
- ✅ Semantic Integrity
- ✅ Tamper Detection
- ✅ Deterministic Identity
- ✅ No Trusted Registry
- ✅ No Extension of Trusted Setup
- ✅ Full Zero-Knowledge Preservation

---

## 6. What DCF Is Not

DCF is explicitly **not**:

- ❌ A replacement for proof verification
- ❌ A witness validator
- ❌ A proof comparison mechanism
- ❌ A proof compression scheme
- ❌ A semantic analyzer of execution data

DCF is a **circuit identity layer**.

---

## 7. Conclusion

> **A proof can lie about execution.  
> A circuit cannot lie about intent.**

Deterministic Circuit Fingerprinting establishes a missing layer in zero-knowledge systems:
a **sovereign, mathematical identity of computation**.

By binding proofs to immutable circuit intent,
DCF enables trustless verification **without trust assumptions**.


