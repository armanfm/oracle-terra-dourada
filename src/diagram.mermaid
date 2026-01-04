flowchart LR
  U[User / UI] -->|POST JSON| B[Backend 8080 /mel]
  B -->|fp_bytes + hmac| P[Prover 8081 /prove]
  P -->|proof bytes + public input| R[Robot 5005 /verify]
  R -->|ACCEPT / REJECT| P
  P -->|proof_b64 + y_b64 + same hmac| B
  B -->|Pin JSON receipt| IPFS[Pinata/IPFS]

  %% batching/settlement (opcional)
  B -->|subproof (optional)| A[Aggregator 8082 /aggregate]
  A -->|aggregated proof bytes| S[Semaphore 3030 /submit_proof]
  S -->|root hash commit| SOL[Solana TX (operator wallet)]
  S -->|Pin batch| IPFS
---
flowchart TD
  IN[POST /mel JSON] --> NORM[Normalize Vote\nautor/cid_autor/usuario\ncandidato/voto/produto\n+ extra_fields]
  NORM --> TS[Timestamp + payload_str\nvote_json : timestamp]
  TS --> TAG[DK-PQC-HMAC tag\n(HMAC + Dilithium sig mix)]
  TS --> FP[Derive fp_bytes (Fp)\nfrom hash+PQC signature]
  TAG --> CALL[POST Prover /prove\n{fp_bytes, hmac}]
  FP --> CALL
  CALL --> RET[Receive {proof_b64, y_b64, hmac}]
  RET --> CHECK[Validate returned_hmac == tag_hex]
  CHECK -->|fail| REJ[Reject: HMAC inválida]
  CHECK -->|ok| RECEIPT[Build receipt JSON\nurn_id, vote, ts,\nproof_b64, verifying_key]
  RECEIPT --> PIN[Pin JSON to IPFS (Pinata JWT)]
  PIN --> OUT[Return CID / Pinata response]
---

sequenceDiagram
  participant U as User/UI
  participant B as Backend :8080 (/mel)
  participant P as Prover :8081 (/prove)
  participant R as Robot :5005 (/verify)
  participant I as Pinata/IPFS

  U->>B: POST /mel (JSON)
  B->>B: normalize + payload_str + DK-PQC-HMAC + fp_bytes
  B->>P: POST /prove {fp_bytes, hmac}
  P->>P: Halo2 prove (x->y)
  P->>R: POST /verify {proof_bytes, public_inputs}
  R->>R: fingerprint + verify_proof + hash-chain
  R-->>P: ACCEPT/REJECT
  alt REJECT
    P-->>B: success=false
    B-->>U: error (prover/robot reject)
  else ACCEPT
    P-->>B: proof_b64 + y_b64 + same hmac
    B->>B: validate returned_hmac == original
    B->>I: pinJSONToIPFS (receipt)
    I-->>B: CID / response
    B-->>U: CID / response
  end
---

flowchart LR
  A[Aggregator 8082] -->|every 3 items| AP[Aggregated proof bytes]
  AP --> S[Semaphore 3030 /submit_proof]
  S --> H[keccak256(proof_bytes)\nroot_hash]
  H --> AR[anti-replay HashSet]
  AR -->|ok| SOL[send_to_solana(root_hash)\n(operator wallet)]
  AR -->|ok| IPFS[Pinata/IPFS batch\nroot_hash + proof_bytes_hex + operator]
  AR -->|replay| REJ[Reject: already used]

  ---

  flowchart LR
  UI[UI Form\n(author, candidate, extra fields)] -->|POST JSON| B[Backend /mel]
  B -->|CID| UI

