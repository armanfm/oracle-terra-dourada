> **Storage Note**
>
> While the current implementation uses **IPFS via Pinata** for proof and artifact availability,
> the **architectural proposal includes Arweave** as a **final-stage storage layer**.
>
> Arweave is intended specifically for **aggregated proofs and finalized commitments**,
> once proofs are batched, validated, and considered immutable.
>
> This separation is intentional:
> - IPFS is used during active operation and iteration.
> - Arweave is reserved for long-term, permanent storage at the final aggregation stage.
>
> The current use of Pinata does not limit or contradict the final design.
