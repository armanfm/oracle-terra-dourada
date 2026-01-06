## Roadmap Concept — WASM Consensus Machine (Future Extension)

This section describes a **future architectural extension** derived from the Terra Dourada design principles.  
It is intentionally presented as a **theoretical roadmap**, not as a current implementation.

The goal is to extend Terra Dourada from a **verified truth substrate** into a **distributed deterministic computation layer** aligned with the Amadeus WASM runtime.

---

### Motivation

Today, Terra Dourada provides:

- deterministic verification of real-world events  
- append-only factual ledgers  
- immutable binary snapshots (`mind.bin`, `TERRAMIN`)  
- read-only factual consumption by agents  

In the current model, agents **consult** this verified state.

The proposed extension explores a model where agents **execute identical deterministic logic locally** over the same verified state, eliminating query bottlenecks and enabling **consensus-by-computation**.

---

### Concept Overview

The **WASM Consensus Machine** is a deterministic execution layer that:

- consumes immutable Terra Dourada binary snapshots  
- executes versioned WASM modules  
- produces identical outputs on all nodes  
- operates without network calls, clocks, randomness, or side effects  

Verified Reality (Terra Dourada binaries)
↓
Deterministic WASM Execution (same code, same input)
↓
Identical Result on Every Node

yaml
Copiar código

Consensus emerges from **identical computation**, not voting or coordination.

---

### Key Properties

- **Deterministic** — same input always produces the same output  
- **Local-first** — execution happens locally on each node  
- **Cache-friendly** — binaries are content-addressed and fetched once per version  
- **Composable** — multiple WASM modules can target the same factual snapshot  
- **Agent-native** — agents become executors, not API consumers  

---

### Non-Goals (Explicit)

This roadmap explicitly does **not** aim to:

- replace Terra Dourada verification  
- verify real-world data inside WASM  
- generate facts from unverified inputs  
- bypass Robot validation or ZK proofs  
- redefine blockchain consensus  

All truth continues to be produced exclusively by Terra Dourada’s verification pipeline.

---

### Proposed Execution Model

Inputs to the WASM Consensus Machine:

- `binary_hash` — identifies the immutable Terra Dourada snapshot  
- `wasm_module_hash` — identifies the deterministic logic  
- `execution_params` — optional parameters (fully deterministic)  

Execution rules:

- no IO  
- no clocks  
- no randomness  
- no external state  

Outputs are pure functions of inputs and can be hashed and compared across nodes.

---

### Why This Is a Roadmap Item

This concept requires:

- strict deterministic WASM sandboxing  
- runtime guarantees inside Amadeus  
- economic and operational incentives for execution  
- standardized execution contracts  

These components are **outside the current Terra Dourada scope** and are therefore intentionally positioned as future work.

---

### Why It Matters

If implemented, this extension would enable:

- large-scale agent coordination without central APIs  
- deterministic matching, scoring, and routing  
- elimination of query bottlenecks  
- execution-native consensus over verified reality  

This aligns naturally with Amadeus’ WASM runtime and uPoW design philosophy.

---

### Summary

Terra Dourada today provides **verified reality**.

The proposed WASM Consensus Machine explores how **identical deterministic computation** over that reality could enable scalable, agent-native coordination — as a future extension, not a current dependency.

This roadmap preserves Terra Dourada’s core guarantees while opening a new design axis for distributed systems.
