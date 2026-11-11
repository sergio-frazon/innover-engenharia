// Validação de CPF e CNPJ por dígito verificador (R-CAD-02)

export function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "")
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const nums = d.split("").map(Number)
  for (const n of [9, 10]) {
    let soma = 0
    for (let i = 0; i < n; i++) soma += nums[i] * (n + 1 - i)
    const dv = ((soma * 10) % 11) % 10
    if (dv !== nums[n]) return false
  }
  return true
}

export function cnpjValido(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "")
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false
  const nums = d.split("").map(Number)
  const pesos = [
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  ]
  for (const p of pesos) {
    const soma = p.reduce((acc, peso, i) => acc + peso * nums[i], 0)
    const resto = soma % 11
    const dv = resto < 2 ? 0 : 11 - resto
    if (dv !== nums[p.length]) return false
  }
  return true
}
