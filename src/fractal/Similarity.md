# How Terra Dourada Computes Similarity (Technical Explanation)

Terra Dourada Brands does **not** decide outcomes, interpret meaning, or apply legal reasoning.  
It performs **deterministic similarity measurement** over text, using multiple formal projections of the same input.

The core question the engine answers is:

> **“Which element in the loaded set is the closest to this text, according to fixed, reproducible rules?”**

Nothing more.

---

## 1) Input Model

The engine receives only:

- a **query string**
- a **finite set of strings** loaded from a deterministic memory file (`mind.bin` / `TERRAMIN`)

There is:
- no external context
- no training
- no hidden state
- no adaptive behavior

---

## 2) Deterministic Text Projections

Each string is projected into multiple **deterministic formal spaces**.  
All projections are reproducible and do not depend on learning.

### A) Byte-Level Projection (`bytes_pct`)

The text is treated as a raw sequence of bytes and converted into a fixed-length bit vector.

This captures:
- visual and orthographic structure
- shared substrings
- truncations and abbreviations
- spacing and punctuation patterns
- overall shape and length similarity

This metric is strong at detecting **surface-form proximity**.

---

### B) SHA-256–Derived Projection (Lossy) (`sha256_pct`)

The text is:
1. hashed using SHA-256
2. converted into a lossy textual representation
3. projected again into a bit vector

This creates a **second, independent comparison space**.

Purpose:
- reduce over-reliance on direct visual similarity
- introduce structural divergence under transformation
- provide a complementary deterministic signal

> This is **not** semantic AI and **not** cryptographic meaning.  
> It is a deterministic transformation used for structural comparison.

---

### C) Controlled Linguistic Projections (Extended Engine)

In the full engine implementation, additional deterministic metrics are computed:

- **Levenshtein distance** — minimal edit distance after canonicalization
- **Trigram Jaccard similarity** — local substring overlap
- **Polynomial kernel over trigrams** — distributional pattern similarity

All of these:
- are rule-based
- have fixed formulas
- do not learn or adapt

---

## 3) Metric Normalization

Each metric produces a normalized value in the range **[0.0, 1.0]**.

Example (conceptual):

- `bytes_pct = 0.87`
- `sha256_pct = 0.61`
- `lev_pct = 0.79`
- `tri_pct = 0.74`
- `poly2_pct = 0.70`

No metric is hidden.  
No dynamic weighting is applied.

---

## 4) Selection Rule (Deterministic)

Depending on the engine mode, one of the following fixed rules is used.

### Simple Rule (Documented Default)

```text
winner_pct = max(bytes_pct, sha256_pct)
Meaning:

no averaging

no composite scoring

the strongest signal wins

This ensures:

full explainability

stable rankings

absence of “magic scores”

Extended Rule (Full Engine)
text
Copiar código
winner_pct = average(Bytes, SHA, Base64, LEV, TRI, POLY2)
Still:

fixed formula

no training

no runtime tuning

5) Stable Ordering
All candidates in the loaded set are:

evaluated with the same metrics

ranked by winner_pct

tie-broken using fixed, deterministic rules

Given the same input and the same memory, the output order is always identical.

This enables:

offline verification

reproducible audits

historical comparison

6) What the Engine Intentionally Does NOT Do
The engine does not:

infer meaning

understand intent

apply contextual judgment

generalize beyond the loaded data

hallucinate relationships

Any interpretation happens outside the engine.

7) Why Hallucination Is Impossible
Hallucination occurs when systems:

extrapolate beyond data

fill missing gaps

generate unseen associations

Terra Dourada prevents this by design:

only loaded entries can be compared

if an item is not in mind.bin, it cannot appear

similarity is measured, not inferred

no metric generates new information

The engine does not “find something similar.”
It measures formal proximity.

8) Output Semantics
The engine outputs only:

the closest element in the loaded set

explicit similarity metrics

the rule used to select the winner

No interpretation is attached.

One-Sentence Summary
Terra Dourada does not infer similarity — it computes it deterministically across multiple formal projections of the same text.

Or, even shorter:

No learning. No guessing. Only measurable proximity.

Copiar código
