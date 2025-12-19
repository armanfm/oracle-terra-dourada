## Backend Security Roadmap

This roadmap outlines the progressive hardening of the Terra Dourada backend.
It explicitly separates what is already implemented from planned enhancements,
without altering the current cryptographic protocol guarantees.

The focus is on incremental, composable improvements rather than monolithic redesign.

---

## Phase 0 — Current State (Implemented)

The following protections are already implemented and operational:

### Cryptographic Core
- Ephemeral Dilithium PQC private key generated at runtime.
- PQC private key kept exclusively in volatile memory.
- No persistence, serialization, logging, or network exposure of private keys.
- Signatures used only as intermediate values and never exposed externally.
- Deterministic derivation of ZK public inputs from PQC signatures.

### Interaction and Session Protection
- Ephemeral 256-bit HMAC key generated per backend runtime.
- HMAC protected with memory zeroization.
- Mandatory request–response binding using HMAC validation.
- Proof rejection on HMAC mismatch.
- Protection against replay and proof substitution.

### Protocol Guarantees
- No reusable cryptographic artifacts.
- No single point of cryptographic failure.
- Clear separation between origin authentication (PQC) and usage control (HMAC).

---

## Phase 1 — Infrastructure Hardening (Planned)

These improvements strengthen availability and abuse resistance without modifying cryptographic logic.

### Rate Limiting and Throttling
- Add request rate limiting at API or reverse proxy level.
- Prevent brute-force and resource exhaustion attacks.
- Enforce per-IP and per-endpoint quotas.

### Basic Observability
- Structured logging for request volume and error rates.
- Metrics export for abnormal traffic detection.
- Alerting on repeated HMAC failures or prover errors.

---

## Phase 2 — Key Exposure Mitigation (Optional)

These controls address advanced attacker models involving memory inspection.

### Memory Protection Enhancements
- Optional isolation of signing logic into a separate process.
- Exploration of secure memory locking where supported.
- Evaluation of hardware-backed execution environments (e.g. SGX, TrustZone).

These measures are optional and environment-dependent.
They do not change the cryptographic protocol.

---

## Phase 3 — Incident Response and Governance

These features address operational resilience rather than cryptographic correctness.

### Incident Response Strategy
- Defined procedures for suspected key compromise.
- Forced backend restart to invalidate ephemeral keys.
- Explicit invalidation of affected sessions.

### Key Rotation Policy
- Automatic regeneration of PQC and HMAC keys on restart.
- Optional scheduled restarts for key freshness.

### Operational Freeze Controls
- Ability to temporarily halt proof acceptance.
- Preserve verification of previously accepted proofs.

---

## Phase 4 — Advanced Monitoring and Auditing (Future)

These features improve long-term security posture and transparency.

### Anomaly Detection
- Behavioral analysis of request patterns.
- Detection of abnormal prover interactions.
- Correlation of failed validations across time windows.

### Audit and Compliance
- Formal threat model documentation.
- Clear definition of in-scope and out-of-scope attacker capabilities.
- Periodic security reviews aligned with protocol changes.

---

## Design Principle

Security is layered and explicit.

- Cryptography ensures correctness.
- Protocol design prevents misuse.
- Infrastructure controls abuse.
- Governance defines response.

Each layer can evolve independently without breaking the system.
