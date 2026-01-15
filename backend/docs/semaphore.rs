use warp::Filter;
use serde::Serialize;
use bytes::Bytes;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashSet;
use tiny_keccak::{Hasher, Keccak};
use serde_json::json;
use reqwest::Client;

// =========================
// CONSTANTES
// =========================

const PINATA_JSON_ENDPOINT: &str =
    "https://api.pinata.cloud/pinning/pinJSONToIPFS";

const AMA_RPC_ENDPOINT: &str =
"https://rpc.amadeus.network:26657";

// =========================
// HELPERS
// =========================

fn keccak256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Keccak::v256();
    let mut out = [0u8; 32];
    hasher.update(data);
    hasher.finalize(&mut out);
    out
}

// =========================
// API RESPONSE
// =========================

#[derive(Serialize)]
struct ApiResponse {
    success: bool,
    message: String,
    root_hash: Option<String>,
}

// =========================
// SEMAPHORE STATE
// =========================

pub struct Semaphore {
    pub used_proof_hashes: HashSet<[u8; 32]>,
}

impl Semaphore {
    pub fn new() -> Self {
        Self {
            used_proof_hashes: HashSet::new(),
        }
    }
}

// =========================
// AMA TRANSACTION STRUCT
// =========================

#[derive(Serialize)]
struct AmaTx {
    from: String,
    payload: String,
    timestamp: i64,
}

// =========================
// SEND ROOT HASH → AMA
// =========================

async fn send_to_ama(
    root_hex: &str,
    operator: &str,
) {
    println!("🟡 Enviando root hash → AMA");

    let tx = AmaTx {
        from: operator.to_string(),
        payload: root_hex.to_string(),
        timestamp: chrono::Utc::now().timestamp(),
    };

    let client = Client::new();

    let resp = client
        .post(AMA_RPC_ENDPOINT)
        .json(&json!({
            "method": "broadcast_tx",
            "params": tx
        }))
        .send()
        .await;

    match resp {
        Ok(r) => {
            let txt = r.text().await.unwrap_or_default();
            println!("✅ AMA respondeu: {}", txt);
        }
        Err(e) => {
            println!("❌ Erro ao enviar para AMA: {:?}", e);
        }
    }
}

// =========================
// UPLOAD BATCH → PINATA
// =========================

async fn upload_batch_to_pinata(
    root_hex: &str,
    proof_bytes_hex: &str,
    operator: &str,
    jwt: &str,
) {
    println!("📦 Enviando batch → Pinata");

    let payload = json!({
        "type": "terra_dourada_batch",
        "root_hash": root_hex,
        "proof_bytes_hex": proof_bytes_hex,
        "operator": operator,
        "timestamp": chrono::Utc::now().timestamp()
    });

    let client = Client::new();

    let resp = client
        .post(PINATA_JSON_ENDPOINT)
        .header("Authorization", format!("Bearer {}", jwt))
        .json(&payload)
        .send()
        .await;

    match resp {
        Ok(r) => {
            let txt = r.text().await.unwrap_or_default();
            println!("📦 Pinata respondeu: {}", txt);
        }
        Err(e) => {
            println!("❌ Erro ao enviar Pinata: {:?}", e);
        }
    }
}

// =========================
// WARP FILTERS
// =========================

fn with_semaphore(
    sem: Arc<Mutex<Semaphore>>,
) -> impl Filter<Extract = (Arc<Mutex<Semaphore>>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || sem.clone())
}

fn with_jwt(
    jwt: String,
) -> impl Filter<Extract = (String,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || jwt.clone())
}

// =========================
// MAIN HANDLER
// =========================

async fn handle_submit(
    proof_bytes: Bytes,
    semaphore: Arc<Mutex<Semaphore>>,
    pinata_jwt: String,
) -> Result<impl warp::Reply, warp::Rejection> {

    println!("📥 Prova recebida: {} bytes", proof_bytes.len());

    let mut sem = semaphore.lock().await;

    // 1️⃣ Hash determinístico
    let proof_hash = keccak256(&proof_bytes);
    let root_hex = hex::encode(proof_hash);

    println!("🔹 Root hash: {}", root_hex);

    // 2️⃣ Anti-replay
    if sem.used_proof_hashes.contains(&proof_hash) {
        return Ok(warp::reply::json(&ApiResponse {
            success: false,
            message: "Prova já utilizada".into(),
            root_hash: None,
        }));
    }

    sem.used_proof_hashes.insert(proof_hash);

    // 3️⃣ Enviar → AMA
    let operator = "HFZhLLhNWZyuqT2YpraFWhMRjQtAMwsfPA3PiGQBNw6D";

    send_to_ama(
        &root_hex,
        operator,
    ).await;

    // 4️⃣ Enviar batch → IPFS
    let proof_bytes_hex = hex::encode(&proof_bytes);

    upload_batch_to_pinata(
        &root_hex,
        &proof_bytes_hex,
        operator,
        &pinata_jwt,
    ).await;

    // 5️⃣ OK
    Ok(warp::reply::json(&ApiResponse {
        success: true,
        message: "Prova ancorada em AMA + IPFS".into(),
        root_hash: Some(root_hex),
    }))
}

// =========================
// MAIN
// =========================

#[tokio::main]
async fn main() {
    println!("🚀 Terra Dourada Semaphore — AMA + IPFS");
    println!("🌐 Endpoint → POST /submit_proof");

    let semaphore = Arc::new(Mutex::new(Semaphore::new()));

    let pinata_jwt =
        std::env::var("PINATA_JWT")
            .expect("❌ PINATA_JWT não definido");

    let route =
        warp::path("submit_proof")
            .and(warp::post())
            .and(warp::body::bytes())
            .and(with_semaphore(semaphore))
            .and(with_jwt(pinata_jwt))
            .and_then(handle_submit);

    warp::serve(route)
        .run(([127, 0, 0, 1], 3030))
        .await;
}

