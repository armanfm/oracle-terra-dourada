use warp::Filter;
use serde::{Deserialize, Serialize};

use std::{
    env,
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::Path,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};

use sha2::{Sha256, Digest};
use terra_dourada_gpt::fxl_turbo::treino::{executar_treino_completo, TreinoConfig};

// ======================================================
// CONFIG
// ======================================================

#[derive(Clone)]
struct Paths {
    ledger: String,
    treino: String,
    mind: String,
    resultados: String,
}

#[derive(Clone)]
struct State {
    paths: Paths,
}

type SharedState = Arc<Mutex<State>>;

// ======================================================
// REQUEST / RESPONSE
// ======================================================

#[derive(Deserialize)]
struct AppendRequest {
    hash_hex: String,
}

#[derive(Serialize)]
struct StateResponse {
    version: u64,
    fp_hex: String,
}

// ======================================================
// UTILS
// ======================================================

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

fn read_file(path: &str) -> String {
    if !Path::new(path).exists() {
        return String::new();
    }
    let mut s = String::new();
    File::open(path).unwrap().read_to_string(&mut s).unwrap();
    s
}

fn count_versions(ledger: &str) -> u64 {
    ledger.lines().filter(|l| !l.trim().is_empty()).count() as u64
}

fn ensure_parent(path: &str) {
    if let Some(p) = Path::new(path).parent() {
        if !p.as_os_str().is_empty() {
            let _ = fs::create_dir_all(p);
        }
    }
}

fn fp_from_mind_and_version(mind_path: &str, version: u64) -> String {
    let mind_bytes = fs::read(mind_path).unwrap_or_default();
    let mut h = Sha256::new();
    h.update(&mind_bytes);
    h.update(version.to_le_bytes());
    hex::encode(h.finalize())
}

// ======================================================
// CORE
// ======================================================

fn append_ledger_and_rebuild(paths: &Paths, hash_hex: &str) -> (u64, String) {
    // garante diretórios dos arquivos
    ensure_parent(&paths.ledger);
    ensure_parent(&paths.treino);
    ensure_parent(&paths.mind);
    ensure_parent(&paths.resultados);

    // versiona
    let ledger_text = read_file(&paths.ledger);
    let version = count_versions(&ledger_text) + 1;
    let ts = now_secs();

    // append ledger
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&paths.ledger)
        .unwrap();

    writeln!(f, "v={}|ts={}|hash={}", version, ts, hash_hex).unwrap();

    // rebuild treino input a partir do ledger
    let mut treino = File::create(&paths.treino).unwrap();
    let ledger_now = read_file(&paths.ledger);
    for line in ledger_now.lines() {
        let l = line.trim();
        if !l.is_empty() {
            writeln!(treino, "{}", l).unwrap();
        }
    }

    // rebuild mind.bin (treino completo)
    let mut cfg = TreinoConfig::new(paths.treino.clone());
    cfg.salvar_mind_bin = true;
    cfg.caminho_mind_bin = Some(paths.mind.clone());
    cfg.salvar_resultados = true;
    cfg.caminho_resultados = Some(paths.resultados.clone());

    cfg.habilitar_autoencoder = true;
    cfg.epochs_autoencoder = 50;
    cfg.treino_global = true;

    cfg.habilitar_similaridade = true;
    cfg.limite_similaridade = 0.59;

    cfg.habilitar_contexto = true;

    executar_treino_completo(cfg).unwrap();

    // FP = hash(mind.bin) + versão
    let fp_hex = fp_from_mind_and_version(&paths.mind, version);
    (version, fp_hex)
}

// ======================================================
// HANDLERS
// ======================================================

async fn append_handler(
    body: AppendRequest,
    shared: SharedState,
) -> Result<impl warp::Reply, warp::Rejection> {
    // pega paths e solta lock (não segura mutex durante treino pesado)
    let paths = {
        let lock = shared.lock().unwrap();
        lock.paths.clone()
    };

    let (version, fp_hex) = append_ledger_and_rebuild(&paths, body.hash_hex.trim());

    Ok(warp::reply::json(&StateResponse { version, fp_hex }))
}

async fn state_handler(shared: SharedState) -> Result<impl warp::Reply, warp::Rejection> {
    let paths = {
        let lock = shared.lock().unwrap();
        lock.paths.clone()
    };

    let ledger = read_file(&paths.ledger);
    let version = count_versions(&ledger);
    let fp_hex = fp_from_mind_and_version(&paths.mind, version);

    Ok(warp::reply::json(&StateResponse { version, fp_hex }))
}

// ======================================================
// MAIN
// ======================================================

#[tokio::main]
async fn main() {
    let state = State {
        paths: Paths {
            ledger: env::var("TD_LEDGER_PATH").unwrap_or_else(|_| "src/data/info_ledger.log".into()),
            treino: env::var("TD_TREINO_INPUT").unwrap_or_else(|_| "src/data/treino_input.txt".into()),
            mind: env::var("TD_MIND_PATH").unwrap_or_else(|_| "src/data/mind.bin".into()),
            resultados: env::var("TD_RESULT_PATH").unwrap_or_else(|_| "src/data/resultados_fxl.txt".into()),
        },
    };

    let shared: SharedState = Arc::new(Mutex::new(state));

    // ✅ CORREÇÃO E0382: cada rota recebe seu clone
    let shared_append = shared.clone();
    let shared_state = shared.clone();

    let append = warp::path("append")
        .and(warp::post())
        .and(warp::body::json())
        .and(warp::any().map(move || shared_append.clone()))
        .and_then(append_handler);

    let state_route = warp::path("state")
        .and(warp::get())
        .and(warp::any().map(move || shared_state.clone()))
        .and_then(state_handler);

    println!("🧠 info_local soberano rodando em http://127.0.0.1:7070");

    warp::serve(append.or(state_route))
        .run(([127, 0, 0, 1], 7070))
        .await;
}
