use warp::Filter;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use sha2::{Sha256, Digest};

use halo2_proofs::{
    dev::MockProver,
    plonk::{verify_proof, keygen_vk, SingleVerifier, VerifyingKey},
    poly::commitment::Params,
    transcript::{Blake2bRead, Challenge255},
};
use halo2curves::pasta::{vesta::Affine as EqAffine, pallas::Base as Fp};
use halo2curves::ff::PrimeField;

use halo2_minimal::{MyCircuit, reset_fingerprint, read_fingerprint};

use std::fs;
use std::io::{self, Read, Write};
use std::path::Path;
use std::env;

// ======================================================
// CONFIG
// ======================================================

const FP_PATH: &str = "data/circuit_fingerprint.bin";
const DEFAULT_PASSWORD: &str = "1234";
const K: u32 = 8;

// ======================================================
// PERSISTÊNCIA DO FINGERPRINT (IGUAL AO SEU)
// ======================================================

fn load_fingerprint() -> Option<Vec<u8>> {
    if !Path::new(FP_PATH).exists() {
        return None;
    }
    let mut f = fs::File::open(FP_PATH).ok()?;
    let mut buf = Vec::new();
    f.read_to_end(&mut buf).ok()?;
    Some(buf)
}

fn save_fingerprint(fp: &[u8]) -> std::io::Result<()> {
    fs::create_dir_all("data")?;
    let mut f = fs::File::create(FP_PATH)?;
    f.write_all(fp)?;
    Ok(())
}

// ======================================================
// GOVERNANÇA (3 AUTORIZAÇÕES) — IGUAL AO SEU
// ======================================================

fn authorize(role: &str) -> bool {
    let expected = env::var("ROBOT_PASSWORD")
        .unwrap_or_else(|_| DEFAULT_PASSWORD.to_string());

    print!("🔐 [{}] Enter authorization password: ", role);
    io::stdout().flush().unwrap();

    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();

    let input = input.trim();

    if input == expected {
        println!("✅ [{}] Authorized", role);
        true
    } else {
        println!("❌ [{}] Authorization failed", role);
        false
    }
}

// ======================================================
// 🛡️ STARK CONSTITUCIONAL (EXATAMENTE O SEU)
// ======================================================

#[derive(Clone)]
struct Step {
    data: Vec<u8>,
}

#[derive(Clone)]
struct StarkProof {
    final_hash: [u8; 32],
    steps: usize,
}

fn hash_step(prev: &[u8], data: &[u8]) -> [u8; 32] {
    println!("🔧 [CONSTITUCIONAL] Hash step | prev={:x?} | data={:?}", prev, data);

    let mut h = Sha256::new();
    h.update(prev);
    h.update(data);
    let out = h.finalize();

    let mut arr = [0u8; 32];
    arr.copy_from_slice(&out);

    println!("🧩 [CONSTITUCIONAL] Resultado do hash-step: {:x?}", arr);
    arr
}

fn generate_proof(trace: &[Step]) -> StarkProof {
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("🛡️ [CONSTITUCIONAL] Gerando prova STARK…");
    println!("🔢 Steps no trace: {}", trace.len());

    let mut current = [0u8; 32];
    for (i, step) in trace.iter().enumerate() {
        println!("➡️ Step {}: {:?}", i, step.data);
        current = hash_step(&current, &step.data);
    }

    println!("🏁 [CONSTITUCIONAL] Hash final do trace: {:x?}", current);

    StarkProof {
        final_hash: current,
        steps: trace.len(),
    }
}

fn verify_stark(trace: &[Step], proof: &StarkProof) -> bool {
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("🛡️ [CONSTITUCIONAL] Verificando prova STARK…");

    if proof.steps != trace.len() {
        println!("❌ [CONSTITUCIONAL] Número de steps não corresponde!");
        return false;
    }

    let mut current = [0u8; 32];
    for (i, step) in trace.iter().enumerate() {
        println!("➡️ Verificando step {}: {:?}", i, step.data);
        current = hash_step(&current, &step.data);
    }

    println!("🔍 [CONSTITUCIONAL] Hash reconstruído: {:x?}", current);

    if current == proof.final_hash {
        println!("🟢 [CONSTITUCIONAL] Prova STARK válida!");
        true
    } else {
        println!("🔴 [CONSTITUCIONAL] Prova STARK inválida!");
        false
    }
}

// ======================================================
// API
// ======================================================

#[derive(Deserialize)]
struct VerifyRequest {
    proof: Vec<u8>,
    public_inputs: Vec<Vec<u8>>,
}

#[derive(Serialize)]
struct ApiResponse {
    success: bool,
    message: String,
}

// ======================================================
// ESTADO RUNTIME
// ======================================================

struct State {
    params: Params<EqAffine>,
    vk: VerifyingKey<EqAffine>,
    constitutional_trace: Vec<Step>,
}

type SharedState = Arc<Mutex<State>>;

// ======================================================
// ENDPOINT /verify (SNARK + STARK)
// ======================================================

async fn verify(
    body: VerifyRequest,
    state: SharedState,
) -> Result<impl warp::Reply, warp::Rejection> {

    let mut st = state.lock().unwrap();

    // ---------- SNARK ----------
    let instances: Vec<Fp> = body.public_inputs.iter().map(|v| {
        let mut a = [0u8; 32];
        a.copy_from_slice(v);
        Fp::from_repr(a).unwrap()
    }).collect();

    let l1: &[Fp] = &instances;
    let l2: &[&[Fp]] = &[l1];
    let nested: &[&[&[Fp]]] = &[l2];

    println!("🔍 [SOBERANO] Verificando prova SNARK…");
    let mut transcript =
        Blake2bRead::<_, _, Challenge255<_>>::init(&body.proof[..]);

    let snark_ok = verify_proof(
        &st.params,
        &st.vk,
        SingleVerifier::new(&st.params),
        nested,
        &mut transcript,
    );

    match snark_ok {
        Ok(_) => println!("🟢 [SOBERANO] Prova SNARK válida!"),
        Err(e) => {
            println!("🔴 [SOBERANO] SNARK inválido: {:?}", e);
            return Ok(warp::reply::json(&ApiResponse {
                success: false,
                message: "SNARK inválido".into(),
            }));
        }
    }

    // ---------- STARK CONSTITUCIONAL ----------
    let mut new_trace = st.constitutional_trace.clone();

    let step_data = format!("SNARK_OK_y={:?}", instances[0].to_repr());
    println!("🔧 [CONSTITUCIONAL] Novo step: {}", step_data);

    new_trace.push(Step {
        data: step_data.as_bytes().to_vec(),
    });

    let proof = generate_proof(&new_trace);

    if !verify_stark(&new_trace, &proof) {
        return Ok(warp::reply::json(&ApiResponse {
            success: false,
            message: "Falha constitucional — STARK inválido".into(),
        }));
    }

    st.constitutional_trace = new_trace;

    Ok(warp::reply::json(&ApiResponse {
        success: true,
        message: "SNARK + STARK constitucional OK".into(),
    }))
}

// ======================================================
// MAIN
// ======================================================

#[tokio::main]
async fn main() {
    println!("🤖 ROBÔ — GOVERNANÇA → SNARK → STARK (CONSTITUCIONAL)");

    // ---------- GOVERNANÇA ----------
    reset_fingerprint();

    let x = Fp::from(7);
    let y = x + x;
    let circuit = MyCircuit { x: Some(x), y: Some(y) };

    let prover = MockProver::run(K, &circuit, vec![vec![y]])
        .expect("mock prover falhou");
    prover.verify().expect("circuito inválido");

    let current_fp = read_fingerprint();

    let authorized = match load_fingerprint() {
        None => {
            save_fingerprint(&current_fp).unwrap();
            true
        }
        Some(saved) => {
            if saved == current_fp {
                true
            } else {
                authorize("Circuit Maintainer")
                    && authorize("Security Review")
                    && authorize("Operator Approval")
            }
        }
    };

    if !authorized {
        std::process::exit(1);
    }

    // ---------- RUNTIME ----------
    let params = Params::<EqAffine>::new(K);
    let vk = keygen_vk(&params, &circuit).unwrap();

    let state = Arc::new(Mutex::new(State {
        params,
        vk,
        constitutional_trace: Vec::new(),
    }));

    let route = warp::path("verify")
        .and(warp::post())
        .and(warp::body::json())
        .and(warp::any().map(move || state.clone()))
        .and_then(verify);

    println!("➡️ http://127.0.0.1:5005/verify");
    warp::serve(route)
        .run(([127, 0, 0, 1], 5005))
        .await;
}
