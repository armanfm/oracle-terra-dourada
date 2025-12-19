## Security Model: Protection of PQC and HMAC Keys

This system intentionally employs two independent cryptographic protection mechanisms:
a post-quantum signature scheme (Dilithium) and an HMAC-based integrity mechanism.

These mechanisms protect different assets, operate at different layers, and address distinct threat classes.
Their combination forms a layered security model with no single point of cryptographic failure.

---

## 1. Protection of the PQC Private Key (Dilithium)

### 1.1 Key Generation and Lifetime

The Dilithium keypair is generated at runtime when the backend process starts.

Key properties:
- The private key is created in memory only.
- The private key is never persisted to disk.
- The private key is never loaded from configuration or environment variables.
- The private key exists only for the lifetime of the running process.

On process termination or restart, the key is destroyed and cannot be recovered.

This design intentionally avoids long-lived or reusable PQC signing keys.

---

### 1.2 Memory Residency and Access Control

The private key is held exclusively in volatile memory and shared internally using controlled ownership.

- The key is not serializable.
- The key is not logged.
- The key is not transmitted over the network.
- The key is not exposed via any API endpoint.

The signing operation occurs inline, and the raw signature is immediately reduced via hashing.
The raw Dilithium signature is never returned or exposed as an external artifact.

An attacker would need full process-level compromise (RCE or memory disclosure) to access the private key.
At that point, cryptography is no longer the primary security boundary.

---

### 1.3 Non-Reusability of Signatures

Dilithium signatures are never treated as reusable objects.

The system does not:
- store signatures,
- publish signatures,
- transmit signatures,
- or accept externally supplied signatures.

Instead, the signature is used only as an intermediate value to derive a cryptographic commitment.
Only the derived field element is used in the Zero-Knowledge system.

This prevents valid signatures from becoming transferable or replayable artifacts.

---

## 2. Protection of the HMAC Key

### 2.1 Ephemeral Symmetric Keying

The HMAC key is generated randomly at runtime and stored exclusively in memory.

Key properties:
- The key is 256 bits and generated using a secure RNG.
- The key is wrapped using a zeroization mechanism.
- The key is cleared from memory when dropped.

The HMAC key is never persisted, never logged, and never reused across process restarts.

---

### 2.2 Session-Level Integrity Enforcement

The HMAC is computed over the same payload that feeds the PQC-based derivation.

The prover must return the exact HMAC value associated with the request.
If the returned HMAC does not match, the proof is rejected.

This enforces:
- request–response binding,
- session integrity,
- protection against replay,
- protection against proof substitution.

The HMAC is not used as an identity mechanism.
It strictly enforces operational correctness and contextual validity.

---

## 3. Combined Protection Model: Why Both Are Required

The PQC signature and the HMAC protect different security dimensions.

### 3.1 What the PQC Signature Protects

- Cryptographic authenticity of the event origin.
- Prevention of arbitrary or forged public inputs.
- Binding of public inputs to real, signed data.

The PQC signature does not protect against:
- replay,
- misuse outside the intended session,
- substitution of proofs,
- operational abuse.

---

### 3.2 What the HMAC Protects

- Correct linkage between request and response.
- Temporal and contextual validity.
- Enforcement that a proof corresponds to a specific request.

The HMAC does not protect:
- cryptographic origin authenticity,
- external verifiability,
- non-arbitrary data generation.

---

### 3.3 Effect of the Combined Design

There is no single artifact that an attacker can steal and reuse.

To successfully exploit the system, an attacker would need to:
1. Compromise the PQC signing context to obtain or misuse the private key or signature.
2. Simultaneously compromise the HMAC-protected interaction to produce a valid, accepted response.

Breaking only one mechanism is insufficient:
- A valid PQC-derived input without the correct HMAC is rejected.
- A valid HMAC without a PQC-derived input cannot produce an accepted proof.

This forces attackers to defeat multiple independent protections within the same execution context.

---

## 4. Security Benefits of the Dual-Protection Approach

The combined use of PQC signatures and HMAC provides the following benefits:

- No reusable cryptographic artifacts.
- No long-lived signing keys.
- Strong separation between origin authentication and operational control.
- Reduced attack surface for replay and misuse.
- Clear and auditable security boundaries.

The system remains efficient while significantly increasing the complexity of practical attacks.

---

## 5. Summary

This architecture applies layered security with clearly separated responsibilities:

- Post-quantum signatures authenticate the origin of data.
- HMAC enforces contextual and temporal correctness.
- Zero-Knowledge proofs enforce mathematical consistency.

The absence of any single point of cryptographic failure is a deliberate design choice.
Security is achieved not by trusting one mechanism, but by requiring multiple independent guarantees to hold simultaneously.
