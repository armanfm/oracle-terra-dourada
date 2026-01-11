use std::{env, fs, path::Path, process};

use terra_dourada_gpt::fxl_turbo::treino::{executar_treino_completo, TreinoConfig};

fn ensure_parent_dir(path: &str) -> Result<(), String> {
    let p = Path::new(path);
    if let Some(parent) = p.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("falha create_dir_all({:?}): {}", parent, e))?;
        }
    }
    Ok(())
}

fn file_size(path: &str) -> Option<u64> {
    fs::metadata(path).ok().map(|m| m.len())
}

fn main() {
    let args: Vec<String> = env::args().collect();

    // =========================================================
    // INPUT DEFAULT (SEM ARGUMENTO)
    // =========================================================
    let caminho_txt = args
        .get(1)
        .map(|s| s.as_str())
        .unwrap_or("src/data/aprendizado.txt");

    if !Path::new(caminho_txt).exists() {
        eprintln!("❌ Arquivo não encontrado: {}", caminho_txt);
        process::exit(1);
    }

    // =========================================================
    // WORKSPACE FIXO
    // =========================================================
    let base_dir = "src/data";

    let mind_path = env::var("TD_MIND_PATH")
        .unwrap_or_else(|_| format!("{}/mind.bin", base_dir));

    let result_path = env::var("TD_RESULT_PATH")
        .unwrap_or_else(|_| format!("{}/resultados_fxl.txt", base_dir));

    ensure_parent_dir(&mind_path).unwrap();
    ensure_parent_dir(&result_path).unwrap();

    println!("🧩 TREINO BIN (local)");
    println!("📄 input = {}", caminho_txt);
    println!("🧠 mind.bin = {}", mind_path);
    println!("📊 resultados = {}", result_path);

    // =========================================================
    // CONFIG
    // =========================================================
    let mut config = TreinoConfig::new(caminho_txt.to_string());

    config.salvar_mind_bin = true;
    config.caminho_mind_bin = Some(mind_path.clone());

    config.salvar_resultados = true;
    config.caminho_resultados = Some(result_path.clone());

    config.habilitar_autoencoder = true;
    config.epochs_autoencoder = 50;
    config.treino_global = true;

    config.habilitar_similaridade = true;
    config.limite_similaridade = 0.59;

    config.habilitar_contexto = true;

    if let Err(e) = executar_treino_completo(config) {
        eprintln!("❌ treino falhou: {}", e);
        process::exit(1);
    }

    // =========================================================
    // FALLBACK
    // =========================================================
    let default_out = format!("{}/mind.bin", base_dir);

    if file_size(&mind_path).unwrap_or(0) == 0 && file_size(&default_out).unwrap_or(0) > 0 {
        fs::copy(&default_out, &mind_path).unwrap();
        println!("✅ fallback aplicado");
    }

    println!("✅ treino concluído");
    println!("✅ mind.bin final: {}", mind_path);
}
