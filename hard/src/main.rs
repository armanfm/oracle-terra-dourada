#![no_std]
#![no_main]

use core::panic::PanicInfo;

/// ===============================
/// 🔒 MODELO CONGELADO (treinado antes)
/// ===============================
static COEFFS: [u64; 4] = [
    3,   // peso A
    7,   // peso B
    11,  // peso C
    19,  // peso D
];

/// ===============================
/// 🧮 CÁLCULO DETERMINÍSTICO
/// ===============================
#[inline(always)]
fn deterministic_compute(x: u64) -> u64 {
    let mut acc = 0;

    acc += x * COEFFS[0];
    acc += x * COEFFS[1];
    acc += x * COEFFS[2];
    acc += x * COEFFS[3];

    acc
}

/// ===============================
/// 📍 ENDEREÇO DE SAÍDA (PROVA)
/// ===============================
/// Endereço arbitrário em RAM
const OUTPUT_ADDR: *mut u64 = 0x8000_1000 as *mut u64;

/// ===============================
/// 🚀 ENTRYPOINT REAL (BARE METAL)
/// ===============================
#[unsafe(no_mangle)]
pub extern "C" fn _start() -> ! {
    let input: u64 = 21;

    let output = deterministic_compute(input);

    unsafe {
        OUTPUT_ADDR.write_volatile(output);
    }

    // CPU para aqui: estado final verificável
    loop {
        core::hint::spin_loop();
    }
}

/// ===============================
/// 🚨 PANIC HANDLER
/// ===============================
#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {
        core::hint::spin_loop();
    }
}
