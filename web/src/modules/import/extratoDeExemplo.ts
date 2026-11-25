type Lancamento = [dia: number, historico: string, descricao: string, valor: number]

const doMes: Lancamento[] = [
  [1, 'Pix recebido', 'Empresa Exemplo', 4200],
  [2, 'Pix enviado', 'Aluguel Imobiliaria Exemplo', -1350],
  [3, 'Compra no debito', 'Supermercado Exemplo', -412.35],
  [5, 'Pagamento efetuado', 'Energia Exemplo', -148.9],
  [6, 'Compra no debito', 'Uber Viagem', -27.4],
  [8, 'Compra no debito', 'Netflix', -44.9],
  [10, 'Aplicacao', 'CDB Exemplo', -500],
  [12, 'Compra no debito', 'Farmacia Exemplo', -63.2],
  [14, 'Compra no debito', 'Restaurante Exemplo', -89.5],
  [17, 'Compra no debito', 'Posto Exemplo', -180],
  [19, 'Compra no debito', 'Loja Exemplo', -139.9],
  [21, 'Compra no debito', 'Ifood Exemplo', -58.7],
  [23, 'Pix enviado', 'Pessoa Ficticia', -120],
  [26, 'Compra no debito', 'Cinema Exemplo', -52],
]

const MESES = 6
// Uma variação fixa por mês, para o gráfico não sair reto e o exemplo ser sempre o mesmo.
const FATORES = [0.92, 1.1, 0.97, 1.18, 1.05, 0.9]

const numero = (valor: number) => valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dois = (n: number) => String(n).padStart(2, '0')

/** Seis meses inventados, no formato do CSV do Inter: passa pela api como um extrato de verdade. */
export function extratoDeExemplo(hoje: Date): File {
  let saldo = 1500
  const linhas: string[] = []
  for (let i = 0; i < MESES; i++) {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - MESES + i, 1)
    const extras: Lancamento[] = i === MESES - 2 ? [[15, 'Credito em conta', 'Emprestimo pessoal Exemplo', 3000]] : []
    const parcela: Lancamento[] = i === MESES - 1 ? [[15, 'Pagamento efetuado', 'Parcela emprestimo Exemplo', -310]] : []
    const lancamentos = [...doMes, ...extras, ...parcela].sort((a, b) => a[0] - b[0])
    for (const [dia, historico, descricao, base] of lancamentos) {
      const valor = Math.round((base < 0 && descricao !== 'CDB Exemplo' ? base * FATORES[i] : base) * 100) / 100
      saldo = Math.round((saldo + valor) * 100) / 100
      linhas.push(`${dois(dia)}/${dois(inicio.getMonth() + 1)}/${inicio.getFullYear()};${historico};${descricao};${numero(valor)};${numero(saldo)}`)
    }
  }
  return new File([['Data Lançamento;Histórico;Descrição;Valor;Saldo', ...linhas].join('\n')], 'extrato-de-exemplo.csv', { type: 'text/csv' })
}
