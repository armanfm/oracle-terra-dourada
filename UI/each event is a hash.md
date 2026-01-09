## Event Boundary & Integrity Model

Terra Dourada does **not** perform segmented hashing, frame analysis, or stream aggregation.

Each event is treated as a **closed, atomic capture**.

### Canonical Rule

- One capture session → one event
- One event → one deterministic hash
- If capture stops, the event ends
- A new capture always produces a new hash

There is no concept of “continuation” or “partial validation”.

If a person:
- stops recording
- pauses filming
- edits the content
- trims the media
- recompresses the file

the original hash **no longer matches**.

This immediately proves that the presented content is **not the same event**.

---

## Why This Design Is Intentional

Terra Dourada prioritizes **clarity and mathematical finality** over complexity.

By hashing the **entire captured content as a single unit**:

- integrity guarantees are absolute
- verification is trivial and fast
- falsification is immediately detectable
- no ambiguous interpretation is possible

There is no need for:
- frame-level hashing
- Merkle trees
- streaming proofs
- partial verification modes

Any modification — of any kind — changes the hash.

---

## Practical Implication

If someone claims continuity after stopping a recording:

That is **not the same event**.

They must produce:
- a new capture
- a new hash
- a new event

The system does not attempt to “merge” reality.

It records **what was captured**, exactly as it was captured.
