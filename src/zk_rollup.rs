// ======================================================
//  TERRA DOURADA — ZK ROLLUP SOBERANO
//  Robô = Verificador de provas Halo2 reais
//  Agregador = Apenas agrega flags booleanas
//  Circuito = AggregatorFpCircuit original
// ======================================================

use mimalloc::MiMalloc;
#[global_allocator]
static GLOBAL: MiMalloc = MiMalloc;

use warp::Filter;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

use halo2_proofs::{
    plonk::{create_proof, ProvingKey, VerifyingKey, keygen_pk, keygen_vk},
    poly::commitment::Params,
    transcript::{Blake2bWrite, Challenge255},
};

use halo2curves::pasta::{vesta::Affine as EqAffine, pallas::Base as Fp};
use halo2_proofs::arithmetic::Field;
use halo2curves::ff::PrimeField;

use halo2_minimal::{AggregatorFpCircuit, MyCircuit};

use anyhow::{Result, anyhow};
use base64::{engine::general_purpose, Engine as _};
use reqwest::Client;
use sha2::{Digest, Sha256};

// ======================================================
//  Tipos auxiliares
// ======================================================

#[derive(Debug)]
struct CustomError(String);
impl warp::reject::Reject for CustomError {}

#[derive(Deserialize)]
struct BatchItem {
    proof_b64: String,
    x_b64: String,
    y_b64: String,
}

#[derive(Deserialize)]
struct AggregateRequest {
    batch: Vec<BatchItem>,
}

#[derive(Deserialize)]
struct RegisterVkRequest {
    vk_b64: String,
}

#[derive(Serialize)]
struct ProofResponse {
    proof_b64: String,
}

// ======================================================
//  Utils
// ======================================================

fn decode_fp_from_base64(b64: &str) -> Result<Fp> {
    let decoded = general_purpose::STANDARD.decode(b64)
        .map_err(|e| anyhow!("base64 decode failed: {:?}", e))?;

    if decoded.len() != 32 {
        return Err(anyhow!("expected 32 bytes, got {}", decoded.len()));
    }

    let mut arr = [0u8; 32];
    arr.copy_from_slice(&decoded);

    Fp::from_repr(arr)
        .into_option()
        .ok_or_else(|| anyhow!("invalid Fp bytes"))
}

fn decode_proof_bytes(b64: &str) -> Result<Vec<u8>> {
    Ok(general_purpose::STANDARD.decode(b64)?)
}

// ======================================================
//  CHAMAR O ROBÔ SOBERANO PARA VALIDAR A PROVA INDIVIDUAL
// ======================================================

async fn verificar_no_robo(proof_bytes: Vec<u8>, public_y: Fp) -> bool {
    println!("🛰️ [Agregador → Robô] Enviando prova individual...");

    let client = Client::new();

    let payload = serde_json::json!({
        "proof": proof_bytes,
        "public_inputs": vec![public_y.to_repr().to_vec()]
    });

    match client
        .post("http://127.0.0.1:5005/verify")
        .json(&payload)
        .send()
        .await
    {
        Ok(resp) => {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                let resultado = json.get("success").and_then(|x| x.as_bool()).unwrap_or(false);
                println!("🛰️ [Robô → Agregador] Resultado recebido: {}", resultado);
                return resultado;
            }
            println!("⚠️ Robô retornou JSON inválido.");
            false
        }
        Err(e) => {
            println!("❌ [Erro] Falha ao contactar o Robô: {:?}", e);
            false
        }
    }
}

// ======================================================
//  HANDLER PRINCIPAL DO AGREGADOR
// ======================================================

async fn aggregate_handler(
    body: AggregateRequest,
    vk_agg: Arc<VerifyingKey<EqAffine>>,
    pk_agg: Arc<ProvingKey<EqAffine>>,
) -> Result<impl warp::Reply, warp::Rejection> {

    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("📦 [Agregador] Recebendo batch de {} subprovas", body.batch.len());
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let params = Params::<EqAffine>::new(8);
    let mut flags_fp: Vec<Fp> = Vec::new();

    // ==========================================================
    // 1) Agregador chama o Robô para validar cada subprova
    // ==========================================================
    for (i, item) in body.batch.iter().enumerate() {
        println!("➡️  Subprova {} iniciada", i + 1);

        let proof_bytes = decode_proof_bytes(&item.proof_b64)
            .map_err(|e| warp::reject::custom(CustomError(e.to_string())))?;

        println!("   📄 Prova decodificada ({} bytes)", proof_bytes.len());

        let y_fp = decode_fp_from_base64(&item.y_b64)
            .map_err(|e| warp::reject::custom(CustomError(e.to_string())))?;

        println!("   🔢 Public input Y (Fp): {:?}", y_fp);

        let valida = verificar_no_robo(proof_bytes, y_fp).await;

        println!("   🔍 Resultado do Robô: {}", valida);

        flags_fp.push(if valida { Fp::one() } else { Fp::zero() });

        println!("➡️  Subprova {} concluída\n", i + 1);
    }

    // ==========================================================
    // 2) Preparar dados para o AggregatorFpCircuit
    // ==========================================================

    let sub_proofs = vec![vec![]; flags_fp.len()];

    let sub_public_inputs: Vec<Vec<Fp>> =
        flags_fp.iter().map(|f| vec![*f]).collect();

    let sub_vks = vec![(*vk_agg).clone(); flags_fp.len()];

    println!("📊 [Agregador] Vetores preparados:");
    println!("    sub_proofs.len()        = {}", sub_proofs.len());
    println!("    sub_public_inputs.len() = {}", sub_public_inputs.len());
    println!("    sub_vks.len()           = {}", sub_vks.len());
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // ==========================================================
    // 3) Montar o circuito agregador
    // ==========================================================

    let circuit = AggregatorFpCircuit {
        sub_proofs,
        sub_public_inputs,
        sub_vks,
        params: params.clone(),
    };

    println!("⚙️ [Agregador] Circuito AggregatorFpCircuit montado.");
    println!("⚙️ Iniciando criação da prova agregada...");

    // ==========================================================
    // 4) Criar prova agregada
    // ==========================================================

    let mut proof_bytes = Vec::new();
    let mut transcript =
        Blake2bWrite::<_, _, Challenge255<EqAffine>>::init(&mut proof_bytes);
    let mut rng = rand::thread_rng();

    create_proof(
        &params,
        &pk_agg,
        &[circuit],
        &[&[&[Fp::one()]]], // all_valid = 1
        &mut rng,
        &mut transcript,
    ).unwrap();

    transcript.finalize();

    println!("✅ [Agregador] Prova agregada criada com sucesso!");
    println!("📦 Tamanho final da prova agregada: {} bytes", proof_bytes.len());
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let proof_b64 = general_purpose::STANDARD.encode(&proof_bytes);

    Ok(warp::reply::json(&ProofResponse { proof_b64 }))
}

// ======================================================
//  REGISTRO DE VK SOBERANA DO MyCircuit
// ======================================================

async fn register_vk_soberana(body: RegisterVkRequest)
    -> Result<impl warp::Reply, warp::Rejection>
{
    println!("🧠 Recebendo VK do Prover...");

    let cleaned = body.vk_b64.replace("_TERRA_DOURADA_WATERMARK", "");

    let decoded = general_purpose::STANDARD.decode(&cleaned)
        .unwrap_or_else(|_| cleaned.as_bytes().to_vec());

    let received = String::from_utf8_lossy(&decoded).to_string();
    let hash_received = format!("{:x}", Sha256::digest(received.as_bytes()));

    let params = Params::<EqAffine>::new(8);
    let dummy = MyCircuit { x: None, y: None };
    let vk_expected = keygen_vk(&params, &dummy).unwrap();

    let expected_string = format!("{:#?}", vk_expected);
    let hash_expected = format!("{:x}", Sha256::digest(expected_string.as_bytes()));

    println!("🔍 Hash recebida: {}", hash_received);
    println!("🔍 Hash soberana: {}", hash_expected);

    if hash_received != hash_expected {
        println!("❌ VK rejeitada — circuito divergente.");
        return Ok(warp::reply::json(&serde_json::json!({
            "success": false,
            "valid": false
        })));
    }

    println!("✅ VK soberana registrada!");
    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "valid": true
    })))
}

// ======================================================
// MAIN — INICIA SERVIDOR
// ======================================================

#[tokio::main]
async fn main() -> Result<()> {
    let params = Params::<EqAffine>::new(8);

    println!("🔑 Gerando VK/PK agregadoras (only flags)…\n");

    let dummy = AggregatorFpCircuit {
        sub_proofs: vec![],
        sub_public_inputs: vec![],
        sub_vks: vec![],
        params: params.clone(),
    };

    let vk_agg = Arc::new(keygen_vk(&params, &dummy)?);
    let pk_agg = Arc::new(keygen_pk(&params, (*vk_agg).clone(), &dummy)?);

    let route_register =
        warp::path("register_vk_id")
            .and(warp::post())
            .and(warp::body::json::<RegisterVkRequest>())
            .and_then(register_vk_soberana);

    let route_aggregate =
        warp::path("aggregate")
            .and(warp::post())
            .and(warp::body::json::<AggregateRequest>())
            .and(warp::any().map(move || vk_agg.clone()))
            .and(warp::any().map(move || pk_agg.clone()))
            .and_then(aggregate_handler);

    let routes = route_register.or(route_aggregate);

    println!("🚀 Agregador rodando em http://0.0.0.0:8082\n");
    warp::serve(routes).run(([0, 0, 0, 0], 8082)).await;

    Ok(())
}
