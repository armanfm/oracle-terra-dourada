## Architecture (Mermaid)

### Diagram 1 — Main flow (submission overview)

```mermaid
%%{init: {'flowchart': {'curve': 'basis'}}}%%
flowchart LR
  U[User / UI] -->|POST JSON| B[Backend<br/>:8080<br/>/mel]

  subgraph Oracle["Verifiable agent/oracle (Backend → Prover → Robot)"]
    B -->|fp_bytes + dk_hmac| P[Prover<br/>:8081<br/>/prove]
    P -->|proof + public inputs| R[Robot (Verifier)<br/>:5005<br/>/verify]
    R -->|ACCEPT / REJECT| P
    P -->|proof_b64 + y_b64 + same dk_hmac| B
  end

  B -->|Pin receipt JSON| IPFS[Pinata / IPFS]

  %% optional settlement / batching
  B -.->|subproof (optional)| A[Aggregator<br/>:8082<br/>/aggregate]
  A -.->|aggregated proof| S[Semaphore<br/>:3030<br/>/submit_proof]
  S -.->|root-hash commit| SOL[Solana TX<br/>(operator wallet)]
  S -.->|Pin batch| IPFS
Quick read

User/UI talks only to Backend (/mel).

The verifiable “agent/oracle” is the triad: Backend → Prover → Robot.

On-chain wallet appears only in Semaphore, which commits to Solana.

Aggregator/Semaphore path is optional (dashed).

Diagram 2 — Backend internals (:8080 /mel)
mermaid
Copiar código
%%{init: {'flowchart': {'curve': 'basis'}}}%%
flowchart TD
  IN[POST /mel<br/>JSON] --> NORM[Normalize fields<br/>author • cid_author • user<br/>candidate • vote • product<br/>+ extra_fields]

  NORM --> TS[Timestamp + payload_str<br/>vote_json : timestamp]
  TS --> TAG[DK-PQC-HMAC tag<br/>(HMAC + Dilithium mix)]
  TS --> FP[Derive fp_bytes (Fp)<br/>from hash + PQC signature]

  TAG --> CALL[POST Prover /prove<br/>{ fp_bytes, dk_hmac }]
  FP  --> CALL

  CALL --> RET[Receive<br/>{ proof_b64, y_b64, dk_hmac }]
  RET --> CHECK[Check dk_hmac<br/>returned == original]

  CHECK -->|fail| REJ[Reject<br/>HMAC invalid]
  CHECK -->|ok| RECEIPT[Build receipt JSON<br/>urn_id • vote • ts<br/>proof_b64 • verifying_key]
  RECEIPT --> PIN[Pin JSON to IPFS<br/>(Pinata JWT)]
  PIN --> OUT[Return CID<br/>(Pinata response)]
Diagram 3 — Sequence (from /mel until Robot approves)
mermaid
Copiar código
sequenceDiagram
  autonumber
  participant U as User/UI
  participant B as Backend :8080 (/mel)
  participant P as Prover :8081 (/prove)
  participant R as Robot :5005 (/verify)
  participant I as Pinata/IPFS

  U->>B: POST /mel (JSON)
  B->>B: normalize + payload_str
  B->>B: DK-PQC-HMAC + fp_bytes
  B->>P: POST /prove { fp_bytes, dk_hmac }
  P->>P: Halo2 prove (x → y)
  P->>R: POST /verify { proof_bytes, public_inputs }
  R->>R: fingerprint + verify_proof + hash-chain
  R-->>P: ACCEPT / REJECT

  alt REJECT
    P-->>B: success=false
    B-->>U: error (prover/robot reject)
  else ACCEPT
    P-->>B: proof_b64 + y_b64 + same dk_hmac
    B->>B: check returned dk_hmac == original
    B->>I: pinJSONToIPFS (receipt)
    I-->>B: CID / response
    B-->>U: CID / response
  end
Diagram 4 — Settlement (Aggregator + Semaphore + Solana) — optional but strong
mermaid
Copiar código
%%{init: {'flowchart': {'curve': 'basis'}}}%%
flowchart LR
  A[Aggregator<br/>:8082] -->|every 3 items| AP[Aggregated proof bytes]
  AP --> S[Semaphore<br/>:3030<br/>/submit_proof]

  S --> H[keccak256(proof_bytes)<br/>root_hash]
  H --> AR[Anti-replay<br/>HashSet]

  AR -->|ok| SOL[send_to_solana(root_hash)<br/>(operator wallet)]
  AR -->|ok| IPFS[Pin batch to IPFS<br/>root_hash + proof_hex + operator]
  AR -->|replay| REJ[Reject<br/>already used]
UI (optional)
mermaid
Copiar código
flowchart LR
  UI[UI Form<br/>author • candidate • extra_fields] -->|POST JSON| B[Backend<br/>/mel]
  B -->|CID| UI
