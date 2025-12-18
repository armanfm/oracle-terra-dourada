## 1. Deterministic Circuit Fingerprinting (DCF)

Deterministic Circuit Fingerprinting defines a verifiable, deterministic identity
for zero-knowledge circuits, independent of witnesses and proofs.

It separates **circuit intent** from **proof execution**.

---

### 1.1 Structural Circuit Fingerprint (Configure-Level)

All structural markers are hashed and concatenated deterministically.

**Purpose:**
- Detect semantic changes
- Enable early auditing
- Debug circuit identity
- Operates even without Verifying Key generation

**Limitation:**  
This layer reflects semantic structure, not the compiled cryptographic object.

---

### 1.2 Verifying Key Fingerprint (Canonical Identity)

The **Verifying Key (VK)** is the canonical cryptographic compilation of the circuit.

**Properties:**
- Deterministic
- Independent of witness
- Identical across platforms for the same circuit
- Changes on any semantic modification

Therefore:

> **The hash of the Verifying Key is the cryptographic identity of the circuit.**

This is the strongest possible fingerprint.

---

## 2. Why the Proof Is Not Fingerprinted

A frequent misconception:

> *“Can we fingerprint or compare individual proofs?”*

**No — and we must not.**

**Reasons:**
- Proofs are randomized
- Proofs differ per execution
- Fingerprinting proofs would break Zero-Knowledge guarantees
- Semantic intent is not encoded in proofs

| Object   | Carries Intent? |
|----------|------------------|
| Circuit  | ✅ Yes |
| VK       | ✅ Yes |
| Proof    | ❌ No |
| Witness  | ❌ No |

DCF operates **above proofs**, not inside them.

---

## 3. Operational Model

### Aggregator / Verifier Flow

1. Aggregator knows the expected circuit fingerprint
2. Prover submits:
   - the proof
   - optional circuit fingerprint or VK hash
3. Aggregator verifies:
   - proof validity (ZK)
   - fingerprint equality (identity)

If fingerprints mismatch → **proof rejected**, regardless of validity.

---

## 4. Similarity vs Equality

Two modes are supported:

### 🔒 Strict Mode (Production)
- Exact fingerprint match
- Binary decision
- Full integrity guarantee

### 🔬 Similarity Mode (Audit / Research)
- Bit-level similarity metrics
- Useful for:
  - evolution tracking
  - regression analysis
  - research tooling

> **Note:** Similarity is never required for security — only for observability.

---

## 5. Relationship to Existing Systems

Similar concepts exist implicitly in production ZK systems:

- **zkSync (Matter Labs)** — internal circuit versioning and constraint hashes
- **Scroll** — deterministic circuit identifiers in aggregation pipelines
- **Polygon Hermez** — fixed circuit identities bound to verifier contracts

DCF differs by:
- making the identity explicit,
- being framework-agnostic,
- auditable,
- and decoupled from infrastructure.

---

## 6. Security Properties

DCF provides:

- ✅ Proof-of-Origin
- ✅ Semantic Integrity
- ✅ Tamper Detection
- ✅ No Trusted Setup Extension
- ✅ No External Registry
- ✅ Zero-Knowledge Preservation

---

## 7. What DCF Is Not

- ❌ A replacement for proof verification
- ❌ A witness validator
- ❌ A proof compression mechanism
- ❌ A semantic analyzer of execution data

It is a **circuit identity layer**.

---

## 8. Conclusion

> *“A proof can lie about execution.  
> A circuit cannot lie about intent.”*

Deterministic Circuit Fingerprinting establishes a missing layer in ZK systems:  
**sovereign, mathematical identity of computation**.

By binding proofs to immutable circuit intent, DCF enables trustless verification  
**without trust assumptions**.

---

## References

- Electric Coin Company — *Halo2 Proof System*, 2022  
- Matter Labs — *zkSync Architecture Documentation*  
- Scroll — *zkEVM Circuit Design Notes*  
- Polygon Hermez — *zkRollup Circuit Specifications*  
- Freire, A. — *Deterministic Circuit Fingerprinting*, Independent Research, 2025


