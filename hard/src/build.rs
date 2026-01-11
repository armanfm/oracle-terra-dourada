use std::env;
use std::fs;
use std::path::Path;

fn main() {
    // Nome do binário (igual ao nome do projeto)
    let bin_name = "riscv_verify";

    // Variável oficial do Cargo com o caminho exato do binário
    let bin_env = format!("CARGO_BIN_EXE_{}", bin_name);

    let bin_path = match env::var(&bin_env) {
        Ok(p) => p,
        Err(_) => return, // ainda não existe (ex: cargo check)
    };

    // Pasta destino
    let out_dir = Path::new("src").join("data");
    fs::create_dir_all(&out_dir).unwrap();

    let dest_path = out_dir.join("riscv_verify.elf");

    // Copiar binário
    fs::copy(&bin_path, &dest_path).unwrap();
}
