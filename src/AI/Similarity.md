# Deterministic Similarity Engine (Terra Dourada)

This document explains **how Terra Dourada computes similarity**, independent of trademarks, legal context, or domain-specific interpretation.

The engine is a **general-purpose deterministic similarity system** that operates on text identifiers and produces **auditable, reproducible similarity signals**.

It does **not** use embeddings, machine learning, probabilistic models, or adaptive training.

---

## Core Idea

Similarity is computed by **comparing a query string against a fixed deterministic memory** and selecting the closest candidate using **explicit, explainable metrics**.

Given the same input and the same memory, the output is **always identical**.

There is:
- no randomness
- no tuning
- no hidden weights

---

## Deterministic Memory

All reference data is stored in a **binary memory file** (`.bin`, TERRAMIN format).

This file is:
- append-only at build time
- immutable at runtime
- versioned
- verifiable via SHA-256

The engine never mutates memory during evaluation.

---

## Canonicalization

Before comparison, text is canonicalized deterministically:

- lowercasing
- accent normalization (`á → a`, `ç → c`, etc.)
- controlled whitespace normalization
- UTF-8 validation

This ensures stable behavior across platforms and languages.

---

## Similarity Metrics

For each candidate in memory, the engine computes **multiple independent similarity metrics**.

Each metric returns a value in the range:

`0.0 → 1.0`

---

### 1) Byte Structure Similarity (`bytes_pct`)

- Converts text into a fixed-length bit vector
- Compares bit alignment position-by-position

Captures visual / orthographic structure:
- shared substrings
- truncations
- spacing and punctuation patterns
- length and shape similarity

This is a **pure structural signal**.

---

### 2) SHA-256 Structural Similarity (`sha256_pct`)

- Computes SHA-256 of each string
- Applies a deterministic lossy UTF-8 projection
- Converts the result into a bit vector
- Compares bit similarity

This metric:
- is deterministic
- is not semantic
- provides an independent structural divergence signal
- prevents over-reliance on surface appearance

---

### 3) Base64 Structural Similarity (`base64_pct`)

- Encodes the string in Base64
- Converts the encoded form into a bit vector
- Compares bit similarity

Captures transformation-stable structure under encoding changes.

---

### 4) Levenshtein Similarity (`lev_pct`)

- Computes edit distance on canonicalized ASCII text
- Normalizes by maximum length
- Produces a similarity score instead of a distance

Captures:
- insertions
- deletions
- substitutions

---

### 5) Trigram Jaccard Similarity (`tri_pct`)

- Breaks text into overlapping trigrams
- Computes Jaccard similarity between trigram sets

Captures local overlap and shared fragments.

---

### 6) Polynomial Kernel on Trigrams (`poly2_pct`)

- Counts trigram frequencies
- Computes a normalized polynomial kernel (degree 2)

Emphasizes repeated structural patterns.

---

## Selection Rule (Deterministic)

Two fixed modes exist.

---

### Simple Rule (Documented Default)

**Rule:**
`winner_pct = max(bytes_pct, sha256_pct)`

Meaning:
- no averaging
- no composite scoring
- the strongest signal wins

This guarantees:
- full explainability
- stable rankings
- absence of “magic scores”

---

### Extended Rule (Full Engine Mode)

**Rule:**
`winner_pct = average(bytes_pct, sha256_pct, base64_pct, lev_pct, tri_pct, poly2_pct)`

Still:
- fixed formula
- no training
- no runtime tuning

---

## Stable Ordering

All candidates are:
- evaluated with the same metrics
- ranked by `winner_pct`
- tie-broken using a **fixed deterministic priority order** (constant by implementation)

Given the same input and the same binary memory, the output order is always identical.

This enables:
- offline verification
- reproducible audits
- independent re-execution

---

## Why This Avoids Hallucination

The engine cannot hallucinate because:
- it never generates new content
- it only compares against existing memory
- every score is derived from explicit calculations
- every output references concrete stored entries

There is no probabilistic inference, no guessing, and no model creativity.

---

## Separation of Concerns

This engine computes similarity only.

Any interpretation (semantic, legal, domain-specific) must happen after, in a separate layer.

This prevents:
- authority laundering
- hidden decision logic
- fake intelligence claims

---

## Summary

Terra Dourada similarity is:
- deterministic
- metric-driven
- auditable
- reproducible
- domain-agnostic
- hallucination-resistant

It is a **similarity engine**, not an AI judge.

The engine answers only one question:

> **“Which stored identifier is structurally closest to this input, and why?”**

Nothing more. Nothing less.

