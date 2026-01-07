# Global Authorization Flow

Terra Dourada separates verification, authorization, and on-chain anchoring into explicit deterministic stages.
No stage implicitly authorizes the next.

----------------------------------------------------------------

1. Local Verification (Robot)

The Robot performs local sovereign verification of an event or transaction.

It validates:
- proof integrity
- cryptographic bindings (HMAC / signatures)
- structural consistency of inputs
- internal invariants defined by the verification pipeline

If verification fails, the process terminates immediately.

If verification succeeds, the Robot does NOT submit anything on-chain.
Instead, it emits a commit request to the global state authority.

Output (example):

{
  "proof_hash": "abc123...",
  "cid": "bafy...",
  "instance_id": "oracle_node_01",
  "subject_id": "invoice_84921"
}

At this stage, the transaction is marked as:

PENDING_GLOBAL

----------------------------------------------------------------

2. Global State Commit (info_global)

The info_global service is the deterministic global authority.

Upon receiving a commit request, it:
- Appends the commitment to an append-only global ledger
- Rebuilds the global deterministic state (global_mind.bin)
- Computes a global fingerprint (global_fp)
- Assigns a monotonic global version

This process is fully deterministic and fully reconstructible from the ledger.
No subjective interpretation, voting, or consensus occurs.

----------------------------------------------------------------

3. Explicit Global Authorization

Once the global state is rebuilt, info_global emits an explicit authorization signal.

This signal is the ONLY condition that allows a transaction to proceed on-chain.

Authorization response (example):

{
  "proof_hash": "abc123...",
  "authorized": true,
  "global_version": 42,
  "global_fp": "f91c8e..."
}

This response represents a global authorization order, not a suggestion.

If authorization is not emitted, the transaction remains blocked indefinitely.

----------------------------------------------------------------

4. Controlled On-Chain Release (Rollup / Settlement)

Only after receiving global authorization does the executor release data to the rollup or blockchain.

The on-chain commitment includes:
- proof_hash
- cid
- global_fp
- global_version

The rollup:
- does not verify proofs
- does not make decisions
- only anchors globally authorized commitments

----------------------------------------------------------------

Design Properties

- Deterministic — identical inputs produce identical authorization
- No consensus rounds — authorization emerges from state reconstruction
- No aggregation window — no batching or delay-based attack surface
- Explicit control — nothing moves on-chain without global authorization
- Auditability — global state can be rebuilt from the ledger at any time

----------------------------------------------------------------

Summary

Local verification proves correctness
Global state authorizes execution
On-chain logic anchors commitments

This separation guarantees that only globally authorized, deterministic facts reach the blockchain.
