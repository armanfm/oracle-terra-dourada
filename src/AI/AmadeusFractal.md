## How Amadeus Uses Terra Dourada (Truth Consumption Model)

This section explains **how Amadeus integrates with Terra Dourada** and **what Amadeus does — and does NOT do** with proofs, robots, and ledgers.

There is no ambiguity in responsibilities.

---

## Role of Amadeus

**Amadeus is not a verifier.**  
**Amadeus is not a prover.**  
**Amadeus is not an oracle.**

Amadeus is a **truth consumer and coordinator**.

It consumes **verified reality** produced by Terra Dourada and uses it as a trusted substrate for agents, workflows, and decisions.

---

## What Amadeus Receives

Amadeus **never receives raw proofs**.

Amadeus receives only:

- deterministic binary artifacts (`mind.bin`, `TERRAMIN`)
- ledger-derived receipts (directly or indirectly)
- checkpoint roots (optionally anchored on-chain)

These artifacts already represent **filtered truth**.

---

## What Amadeus Verifies (Cheap, Deterministic)

When Amadeus consumes Terra Dourada data, it checks only:

- the binary artifact integrity (hash / checksum)
- optional checkpoint root consistency
- version compatibility of the artifact format

Amadeus does **not**:
- re-run SNARK verification
- download proofs
- inspect IPFS by default

This makes consumption **fast, scalable, and deterministic**.

---

## Normal Operation Path (99% of Cases)

1. Terra Dourada publishes a new binary artifact
2. Amadeus loads the artifact
3. Amadeus treats all contained entries as **verified facts**
4. Agents operate strictly within this factual boundary

No proofs are revalidated.
No heavy computation is repeated.

---

## Exceptional Audit Path (Rare)

Amadeus may request deeper verification **only if required**, for example:

- dispute resolution
- security review
- governance or regulatory audit
- suspected bug or inconsistency

In that case, Amadeus can:

1. Identify a specific receipt (by hash / metadata)
2. Retrieve the external proof (e.g. IPFS / Pinata)
3. Re-execute verification independently
4. Compare the result with the recorded receipt

This path is **explicit**, **manual**, and **exceptional**.

---

## Semantic Boundary Enforcement

Amadeus enforces a strict boundary:

- **If a receipt exists → the fact exists**
- **If no receipt exists → the fact is unknown**
- **There is no negative fact state**

Agents built on Amadeus:
- cannot invent facts
- cannot interpolate missing data
- cannot exceed the factual substrate

This directly prevents hallucination at the orchestration level.

---

## Interaction Summary (Clear Separation)

| Component | Responsibility |
|---------|----------------|
| Prover | Generates proofs |
| Robot (Oracle) | Verifies proofs |
| Server | Records validated facts |
| Ledger | Append-only factual history |
| Binary Artifacts | Deterministic memory |
| **Amadeus** | Consumes verified reality |

Amadeus never crosses verification or storage boundaries.

---

## Why This Matters for Agents

Because Amadeus consumes **only verified facts**:

- agent outputs are bounded by reality
- reasoning is deterministic over a known state
- language models cannot contaminate truth
- system-wide hallucination is structurally prevented

---

## Final Principle (Amadeus Perspective)

> **Amadeus does not ask “is this true?”  
> Amadeus asks “does this fact exist in Terra Dourada?”**

If it exists, Amadeus can use it.  
If it does not exist, Amadeus treats it as unknown.

Nothing more. Nothing less.
