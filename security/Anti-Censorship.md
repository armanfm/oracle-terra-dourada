# Terra Dourada Oracle — Anti-Censorship Architecture

**Offline-First • Local Sovereign Ledger • Persistent Queue • IPFS Integration • No Mandatory Intermediaries**

The Terra Dourada Oracle is designed to ensure **data persistence, user sovereignty, and auditability** under adverse conditions, including:

- complete loss of internet connectivity  
- backend or service failure  
- DNS or infrastructure takedowns  
- network-level interference  
- physical isolation or remote environments  

## Design Principle

> **A user must always be able to record, store, audit, and export their own data, regardless of external availability.**

---

## 1. Local-First Storage (User-Sovereign Data Ingestion)

All incoming data — including sensor input, serial devices, BLE, HID, local WiFi, or manual user input — is **persisted locally first** using a local database (PouchDB):

```js
await dbDados.put(formattedData);
```

This guarantees:

- no dependency on backend services  
- no dependency on internet availability  
- no dependency on blockchains or external ledgers  
- immediate local ownership of data  

Data persistence occurs at creation time, not after transmission.

---

## 2. Offline Queue and Deferred Transmission

When network connectivity is unavailable, events are written to a **persistent offline queue**:

```js
await saveToOfflineQueue(data, type);
```

The queue provides:

- durable local storage  
- unlimited retry attempts  
- chronological ordering  
- full error traceability  
- automatic resend on reconnection  
- optional manual or scheduled resend  

Data is never dropped due to connectivity constraints.

---

## 3. Local Cryptographic Ledger (Offline Integrity Chain)

Each recorded event includes:

- SHA-256 hash  
- previous record hash  
- timestamp  
- protocol identifier  
- payload reference  

This produces:

- append-only behavior  
- deterministic integrity verification  
- cryptographic chaining independent of any network  

Integrity is enforced locally before any transmission occurs.

---

## 4. Transmission Control and Deduplication

When connectivity is available, the oracle attempts submission:

- failed transmissions return to the queue  
- already-submitted events are deduplicated by hash  
- confirmed submissions store the returned content identifier (CID)  

The client maintains a complete local view of:

- what was generated  
- what was sent  
- what was confirmed  
- what remains pending  

This prevents silent loss or suppression of data.

---

## 5. Distributed Persistence via IPFS

Upon successful submission, the backend returns an IPFS content identifier:

```json
{ "cid": "bafy...xyz" }
```

The data becomes accessible via:

```
https://ipfs.io/ipfs/<cid>
```

IPFS provides:

- content-addressed persistence  
- global distribution  
- redundancy across nodes  
- independence from single operators  

Once propagated, data availability no longer depends on a single system.

---

## 6. Operation Without Continuous Network Access

Even in fully offline environments, the oracle allows users to:

- register events  
- generate hashes  
- maintain the local ledger  
- manage the offline queue  
- export all records  
- sign or transmit later when desired  

The system is designed to operate in environments such as:

- aircraft or maritime contexts  
- rural or remote areas  
- disaster-response zones  
- restricted or isolated networks  

---

## 7. No Mandatory Intermediaries

The oracle enforces no:

- content moderation layer  
- algorithmic filtering  
- platform lock-in  
- external service dependency  

All control remains local to the user, with optional external publication.

---

## 8. Multi-Protocol Offline Data Intake

The system supports local data ingestion via:

- WebSerial  
- WebUSB  
- WebHID  
- WebBluetooth  
- Local WiFi polling  

This allows direct intake from physical devices even in the absence of telecommunications infrastructure.

---

## 9. Complete Data Export

At any time, the user may export:

- the full local ledger  
- all cryptographic hashes  
- associated CIDs  
- pending queue contents  
- chronological event history  
- protocol-specific datasets  

Export is local, immediate, and unrestricted.

---

## 10. Data Retention and Integrity Policy

The system is append-only by design.

Recorded data is not modified or deleted by the system, ensuring:

- consistent audit trails  
- historical integrity  
- verifiable accountability  

Interpretation, judgment, or enforcement occurs outside the system scope.

---

## Summary

The Terra Dourada Oracle provides:

- local-first persistence  
- offline survivability  
- cryptographic integrity at creation time  
- deferred and verifiable transmission  
- distributed persistence via IPFS  
- user-controlled data lifecycle  

The architecture prioritizes **availability, integrity, and auditability**, independent of network conditions or external authorities.
