import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SaldoDaConta } from './SaldoDaConta'

const saldo = { valor: 1234.5, em: '2026-10-31', informado: true, antesDoHistorico: 0 }

describe('SaldoDaConta', () => {
  it('mostra o saldo do Inter e de quando ele é', () => {
    render(<SaldoDaConta saldo={saldo} />)

    const cartao = screen.getByRole('region', { name: 'Saldo da conta' })
    expect(cartao).toHaveTextContent('Inter')
    expect(cartao).toHaveTextContent(/R\$\s1\.234,50/)
    expect(cartao).toHaveTextContent('Informado pelo banco em 31/10/2026')
    expect(cartao).not.toHaveTextContent(/faltam/i)
  })

  it('avisa quando o saldo é só a soma do que foi importado', () => {
    render(<SaldoDaConta saldo={{ ...saldo, informado: false, antesDoHistorico: null }} />)

    expect(screen.getByText(/soma do que foi importado até 31\/10\/2026/i)).toBeInTheDocument()
  })

  it('avisa que faltam extratos quando a soma não explica o saldo', () => {
    render(<SaldoDaConta saldo={{ ...saldo, antesDoHistorico: 50 }} />)

    expect(screen.getByText(/R\$\s50,00 não vêm dos extratos incluídos/i)).toBeInTheDocument()
  })
})
