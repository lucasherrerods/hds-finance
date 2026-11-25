import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SaldoDaConta } from './SaldoDaConta'

const saldo = { valor: 1234.5, em: '2026-10-31', informado: true, antesDoHistorico: 50 }

describe('SaldoDaConta', () => {
  it('mostra só o banco e o valor', () => {
    render(<SaldoDaConta saldo={saldo} />)

    expect(screen.getByRole('region', { name: 'Saldo da conta' }).textContent).toMatch(/^interSaldo da conta · InterR\$\s1\.234,50$/)
  })

  it('avisa no título quando o saldo é só a soma do que foi importado', () => {
    render(<SaldoDaConta saldo={{ ...saldo, informado: false }} />)

    expect(screen.getByRole('heading', { name: 'Saldo estimado · Inter' })).toBeInTheDocument()
  })
})
