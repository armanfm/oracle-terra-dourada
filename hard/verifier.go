package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"
)

const (
	ELF_PATH     = "data/riscv_verify.elf"
	OUTPUT_ADDR  = "0x80001000"
	EXPECTED_HEX = "0x0000000000000348" // 840 decimal

	// caminhos ABSOLUTOS (ignoram PATH do Windows)
	QEMU_PATH = "C:\\Program Files\\qemu\\qemu-system-riscv64.exe"
	GDB_PATH  = "gdb-multiarch"
)

func sha256File(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func runQemuAndReadMemory() (string, error) {
	// inicia QEMU pausado
	qemu := exec.Command(
		QEMU_PATH,
		"-machine", "virt",
		"-nographic",
		"-kernel", ELF_PATH,
		"-S",
		"-gdb", "tcp::1234",
	)

	qemu.Stdout = os.Stdout
	qemu.Stderr = os.Stderr

	if err := qemu.Start(); err != nil {
		return "", err
	}
	defer qemu.Process.Kill()

	// espera QEMU subir
	time.Sleep(700 * time.Millisecond)

	// script GDB determinístico
	gdbScript := `
target remote :1234
continue
x/gx ` + OUTPUT_ADDR + `
quit
`

	cmd := exec.Command(
		GDB_PATH,
		"--quiet",
		ELF_PATH,
	)

	cmd.Stdin = strings.NewReader(gdbScript)

	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out

	if err := cmd.Run(); err != nil {
		return "", err
	}

	return out.String(), nil
}

func main() {
	fmt.Println("=== RISC-V VERIFIABLE COMPUTE CHECK ===")

	// 1️⃣ Hash do ELF
	hash, err := sha256File(ELF_PATH)
	if err != nil {
		panic(err)
	}
	fmt.Println("ELF SHA256:", hash)

	// 2️⃣ Executar e observar estado
	fmt.Println("Running QEMU + GDB...")
	out, err := runQemuAndReadMemory()
	if err != nil {
		panic(err)
	}

	fmt.Println("GDB output:")
	fmt.Println(out)

	// 3️⃣ Verificação
	if strings.Contains(out, EXPECTED_HEX) {
		fmt.Println("✅ VERIFICATION PASSED")
		fmt.Println("Deterministic execution confirmed.")
	} else {
		fmt.Println("❌ VERIFICATION FAILED")
		fmt.Println("Expected:", EXPECTED_HEX)
	}
}
