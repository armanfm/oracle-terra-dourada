use warp::Filter;
use serde::Serialize;
use bytes::Bytes;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashSet;
use tiny_keccak::{Hasher, Keccak};
use std::process::Command;
use serde_json::json;
use reqwest::Client;

// =========================
// PINATA CONSTANTE
// =========================
const PINATA_JSON_ENDPOINT: &str = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

// =========================
// Helpers
// =========================

fn keccak256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Keccak::v256();
    let mut out = [0u8; 32];
    hasher.update(data);
    hasher.finalize(&mut out);
    out
}

#[derive(Serialize)]
struct ApiResponse {
    success: bool,
    message: String,
    root_hash: Option<String>,
}

// =========================
// Semaphore State
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
// Solana transaction ONLY
// =========================

fn send_to_solana(root_hex: &str) {
    println!("💰 Enviando root hash → Solana...");

    let status = Command::new("node")
        .arg("C:/Users/Armando/generate_keys/send_transaction.js")
        .arg(root_hex)
        .status()
        .expect("erro ao executar send_transaction.js");

    if status.success() {
        println!("✅ Transação enviada!");
    } else {
        println!("❌ Falha ao enviar transação!");
    }
}

// =========================
// Enviar batch completo → Pinata
// =========================

async fn upload_batch_to_pinata(
    root_hex: &str,
    proof_bytes_hex: &str,
    operator: &str,
    jwt: &str,
) {
    println!("📦 Enviando batch completo → Pinata...");

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
            println!("📦 Pinata resposta: {}", txt);
        }
        Err(e) => {
            println!("❌ Erro ao enviar Pinata: {:?}", e);
        }
    }
}

// =========================
// Warp Filters
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
// Handler principal
// =========================

async fn handle_submit(
    proof_bytes: Bytes,
    semaphore: Arc<Mutex<Semaphore>>,
    pinata_jwt: String
) -> Result<impl warp::Reply, warp::Rejection> {

    println!("📥 Recebida prova agregada: {} bytes", proof_bytes.len());

    let mut sem = semaphore.lock().await;

    // 1. Root hash
    let proof_hash = keccak256(&proof_bytes);
    let root_hex = hex::encode(proof_hash);

    println!("🔹 Root hash: {}", root_hex);

    // 2. Anti replay
    if sem.used_proof_hashes.contains(&proof_hash) {
        println!("❌ Prova já usada");
        return Ok(warp::reply::json(&ApiResponse {
            success: false,
            message: "Prova já usada".into(),
            root_hash: None,
        }));
    }

    sem.used_proof_hashes.insert(proof_hash);

    // ============== 3. Solana ==============
    send_to_solana(&root_hex);

    // ============== 4. Pinata ==============
    let operator = "HFZhLLhNWZyuqT2YpraFWhMRjQtAMwsfPA3PiGQBNw6D";
    let proof_bytes_hex = hex::encode(&proof_bytes);

    upload_batch_to_pinata(
        &root_hex,
        &proof_bytes_hex,
        operator,
        &pinata_jwt,
    ).await;

    // 5. Sucesso
    Ok(warp::reply::json(&ApiResponse {
        success: true,
        message: "Prova agregada enviada para Solana + Pinata!".into(),
        root_hash: Some(root_hex),
    }))
}

// =========================
// MAIN
// =========================

#[tokio::main]
async fn main() {
    println!("🚀 Semaphore Terra Dourada — Solana + IPFS");
    println!("💡 Recebendo prova agregada → Solana + Pinata");

    let semaphore = Arc::new(Mutex::new(Semaphore::new()));

    let pinata_jwt = std::env::var("PINATA_JWT")
        .expect("❌ Variável PINATA_JWT ausente!");

    let jwt_filter = with_jwt(pinata_jwt.clone());

    let route_submit =
        warp::path("submit_proof")
            .and(warp::post())
            .and(warp::body::bytes())
            .and(with_semaphore(semaphore.clone()))
            .and(jwt_filter.clone())
            .and_then(handle_submit);

    println!("🌐 Rodando → http://127.0.0.1:3030");

    warp::serve(route_submit)
        .run(([127,0,0,1], 3030))
        .await;
}
