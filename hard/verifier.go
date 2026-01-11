package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"time"
)

const (
	ELF_PATH    = "data/riscv_verify.elf"
	LEDGER_PATH = "data/ledger.txt"
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

func appendLedger(hash string) error {
	f, err := os.OpenFile(
		LEDGER_PATH,
		os.O_CREATE|os.O_APPEND|os.O_WRONLY,
		0644,
	)
	if err != nil {
		return err
	}
	defer f.Close()

	ts := time.Now().Unix()

	_, err = fmt.Fprintf(
		f,
		"artifact=riscv_verify.elf\nsha256=%s\ntimestamp=%d\n---\n",
		hash,
		ts,
	)
	return err
}

func main() {
	fmt.Println("=== RISC-V EXECUTION ARTIFACT AUDIT ===")

	hash, err := sha256File(ELF_PATH)
	if err != nil {
		fmt.Println("ERROR:", err)
		os.Exit(1)
	}

	fmt.Println("Artifact:", ELF_PATH)
	fmt.Println("ELF SHA256:", hash)

	if err := appendLedger(hash); err != nil {
		fmt.Println("Ledger error:", err)
		os.Exit(1)
	}

	fmt.Println()
	fmt.Println("Audit result:")
	fmt.Println("✓ Artifact identity established")
	fmt.Println("✓ Ledger entry recorded")
	fmt.Println("✓ Ready for deterministic replay by any verifier")
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

