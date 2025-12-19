🌟 DK-PQC-HMAC — Deterministic Post-Quantum Hybrid Authentication Layer  
Terra Dourada — Hybrid Cryptographic Authentication Layer

---

## 🏛️ 1. Overview

Terra Dourada introduces a **deterministic hybrid authentication layer** that combines
**symmetric keyed authentication** with **post-quantum asymmetric authenticity**.

This layer explicitly and deterministically composes:

- HMAC-SHA256 (symmetric authentication with a secret key)
- Post-Quantum Dilithium2 signatures (asymmetric authenticity)
- Deterministic mixing of independent entropy domains (XOR)
- Final re-anchoring via HMAC

The result is a **deterministic cryptographic identifier**, used as an
**authenticated commitment**, not as a direct signature.

This identifier provides the following properties:

- ✔ full determinism
- ✔ post-quantum–rooted authenticity
- ✔ resistance to forgery under known cryptographic assumptions
- ✔ resistance to cross-identity cloning
- ✔ independent verification without trusting backend infrastructure

---

## 🔥 2. Why This Layer Exists

Terra Dourada requires properties that **no single cryptographic primitive provides alone**:

- authenticity without trusting servers
- verifiable integrity outside infrastructure control
- resistance to identity cloning across nodes
- post-quantum properties at the root of the system
- sovereign verification by an independent agent (Robot)
- deterministic, public auditability

DK-PQC-HMAC does not replace HMAC or signatures.
It **composes** both to form a **sovereign cryptographic identity layer**.

---

## 🔐 3. Cryptographic Pipeline


### Step-by-step Explanation

**H1 = HMAC(secret_key, payload)**  
Anchors the payload to a local symmetric secret, providing:
- authentication
- determinism
- secrecy

**sig = Dilithium.Sign(payload)**  
Produces a post-quantum signature that:
- proves cryptographic origin
- does not rely on symmetric secrets
- resists known quantum adversaries

**H2 = SHA256(sig)**  
Compacts the PQC signature into a fixed-size 256-bit commitment,
preserving cryptographic binding to the original signature.

**MIX = H1 XOR H2**  
Deterministically mixes two independent security domains:
- symmetric secrecy (HMAC)
- post-quantum authenticity (Dilithium)

XOR is **not** used as a standalone cryptographic primitive,
but as a deterministic entropy mixer.

**tag = HMAC(secret_key, MIX)**  
Re-anchors the mixed result under symmetric secrecy, ensuring that
the final identifier is:
- authenticated
- non-malleable
- verifiable only by parties holding the correct secret

---

## 🧱 4. Threats This Layer Protects Against

DK-PQC-HMAC provides effective protection against:

### ✔ Identity Forgery
Without the Dilithium private key **or** the HMAC secret,
it is computationally infeasible to generate a valid identifier.

### ✔ Cross-Server Cloning
Distinct servers with different keys cannot produce
the same identifier for the same payload.

### ✔ Payload Manipulation
Any modification to the payload changes:
- H1
- H2
- MIX
- the final tag

Verification fails deterministically.

### ✔ Partial Hybrid Attacks
Compromise of **one** security domain (symmetric or asymmetric)
is insufficient to forge a valid identifier.

### ❌ What This Layer Does Not Claim
- it does not prevent replay attacks (handled at the payload level)
- it does not provide payload confidentiality
- it does not claim absolute or future-proof security
- it does not replace full signature verification outside the system

---

## 🤖 5. Robot Verification Model

The Robot **does not possess**:

- the HMAC secret key
- the Dilithium private key
- backend secrets
- trust in any server

It verifies only:

- the derived public identifier
- the associated cryptographic proof
- circuit identity via DVKF
- consistency with the authorized verification context

This enables:

- ✔ sovereign verification
- ✔ independent auditing
- ✔ zero trust in infrastructure

---

## 🧬 6. Identity in Multi-Server Environments

Each Terra Dourada server may operate with:

- its own HMAC secret
- its own Dilithium keypair
- its own logical namespace

Impersonation attempts result in:
- divergent identifiers
- invalid proofs
- deterministic rejection by the Robot

---

## 🔏 7. In-Memory Secret Protection

Sensitive keys are handled using
**automatic memory zeroization structures**, ensuring:

- immediate memory cleanup after use
- no secrets embedded in binaries
- reduced exposure to memory dumps
- mitigation of accidental leakage

This provides **practical secret protection** under realistic threat models.

---

## ⚡ 8. Role Within Terra Dourada

DK-PQC-HMAC acts as the system’s **cryptographic identity root**:

- binds events to a sovereign identity
- provides authenticated, deterministic commitments
- enables public auditability
- underpins the integrity of the full pipeline
- reinforces the separation between execution and authority

---

## 🏆 9. Official Name

**DK-PQC-HMAC — Deterministic Post-Quantum Hybrid Authentication Layer**

Optional thematic name:

**Golden Mantle Authentication Layer**
