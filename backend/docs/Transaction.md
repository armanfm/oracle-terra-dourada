## Transaction Origin & Payment Modes (Design Choice)

In this prototype, the **transaction origin (user-signed vs relayed)** has **not been finalized** as a fixed decision yet.  
The system is designed to support multiple modes because **more payment/settlement options generally increases adoption**.

### Planned supported modes

#### 1) Relayed / Operator-paid settlement
The service acts as an intermediary and publishes the commitment (root hash) using the **operator’s wallet**.  
**Benefit:** simple UX and centralized on-chain cost.  
**Tradeoff:** higher operational trust in the intermediary.

#### 2) User-signed (off-chain) + Operator settlement (hybrid)
The user signs the payload **off-chain** (no on-chain fee), and the operator publishes the commitment **on-chain**.  
**Benefit:** strong authorship without user fees.  
**Tradeoff:** requires a client-side signing step.

#### 3) Direct user on-chain settlement (optional)
The user publishes the commitment/receipt directly to the blockchain.  
**Benefit:** maximum user sovereignty.  
**Tradeoff:** worse UX and requires balance/gas.

> **Note:** the verification pipeline (**prover → robot verifier → receipt**) remains the same; only **who signs/pays for settlement** changes.
