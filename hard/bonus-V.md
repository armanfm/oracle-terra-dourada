# Deterministic Verifiable Compute via Bare-Metal RISC-V

## Overview

This project demonstrates **deterministic and verifiable computation** executed directly on **bare-metal RISC-V**, compiled from Rust without an operating system, runtime, scheduler, or external dependencies.

The goal is not performance benchmarking or probabilistic inference, but **execution integrity**: ensuring that a computation can be **identified, replayed, and verified** as a factual event.

---

## What Problem This Solves

Modern blockchain and distributed systems validate state transitions, but often **do not verify the integrity of off-chain computation**. Existing approaches rely on:

- trusted oracles  
- probabilistic proofs  
- complex zero-knowledge systems  
- heavyweight virtual machines  

This project addresses a more fundamental question:

> **How can computation itself become a verifiable fact, independent of trust in the executor?**

---

## Core Idea

The system binds computation integrity to a **deterministic execution artifact**:

- A **RISC-V bare-metal ELF**
- Fully deterministic execution
- Explicitly defined input, output, and memory semantics
- Identity derived from the binary hash

Verification is achieved by **replay**, not by trust or probabilistic proof.

---

## Execution Model

### 1. Bare-Metal Environment

The executor is compiled with:

- `#![no_std]`
- `#![no_main]`

Guarantees:

- No operating system
- No libc
- No heap allocation
- No scheduler
- No interrupts
- No background processes

This eliminates common sources of nondeterminism.

---

### 2. Deterministic Computation

The computation:

- Uses frozen coefficients
- Uses a fixed input
- Performs pure arithmetic
- Produces a single deterministic output

Given the same binary and input, the execution path and output are **identical** across runs.

---

### 3. Explicit Output Semantics

The program writes its result to a **fixed memory address**:

- Address: `0x80001000`
- Type: `u64`
- Endianness: little-endian

For the provided input, the expected output is:

- Decimal: `840`
- Hexadecimal: `0x0000000000000348`

This output constitutes the **verifiable state** of the computation.

---

## Artifact Identity

The computation is identified by the hash of its ELF binary:

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/06aac74a-6631-4b97-8011-5fe73c643f17" />


This hash uniquely binds:

- execution semantics  
- computation logic  
- output meaning  

Any change in behavior necessarily changes the hash.

---

## Verification Method

Verification is performed by **replaying the execution** in a RISC-V–compatible environment (e.g., emulator or hardware) and observing the resulting memory state.

The verifier does not need to trust the executor.  
It only needs to verify that:

- the binary hash matches
- the execution is deterministic
- the observed output matches the specification

This establishes **verifiable execution by reproducibility**.

---

## Verification Demonstration

The verification process was executed locally using a RISC-V execution environment.

The verifier performs:

1. Hashing the ELF binary  
2. Executing the binary in a RISC-V-compatible environment  
3. Observing the memory value at the defined output address  
4. Comparing the observed value with the expected result  

### Verification Prompt Output (author-provided)

> **Author note:**  
> The following screenshot shows the execution prompt and verification output observed during replay.

<!-- INSERT YOUR TERMINAL SCREENSHOT HERE -->

---

## Trust Model

### Assumptions

- Deterministic CPU semantics
- Correct RISC-V execution model
- No malicious hardware faults

### Eliminated Trust Dependencies

- Operating system
- Runtime libraries
- Schedulers
- Oracles
- Consensus mechanisms
- Probabilistic proofs

The system does **not** require trust in the executor, only the ability to reexecute or audit the artifact.

---

## Relationship to Ledgers and Blockchains

This project intentionally **does not implement a ledger**.

Instead, it defines a **ledger-ready compute artifact**, where a ledger may later commit:

- executor hash  
- input hash  
- output hash  

The ledger **stores facts**, not execution.

This separation preserves simplicity, auditability, and composability with any blockchain or distributed ledger.

---

## Why RISC-V

RISC-V provides:

- Open and auditable ISA
- Stable execution semantics
- Minimal abstraction leakage
- Suitability for bare-metal verification

This makes it an ideal foundation for verifiable computation artifacts.

---

## Conclusion

This project demonstrates that:

- Rust can compile to true RISC-V bare-metal
- Deterministic computation can be enforced structurally
- Computation can be identified by artifact hash
- Verification can be achieved by replay, not trust

This approach does not replace blockchains or zero-knowledge systems.  
It addresses a deeper layer: **how computation itself becomes a verifiable fact**.

