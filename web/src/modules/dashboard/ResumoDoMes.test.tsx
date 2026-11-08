import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResumoDoMes } from './ResumoDoMes'

const outubro = { ano: 2026, mes: 10, entradas: 3500, saidas: 123.45, resultado: 3376.55 }

describe('ResumoDoMes', () => {
  it('mostra o mês e os valores em reais', () => {
    render(<ResumoDoMes mes={outubro} />)

    expect(screen.getByRole('heading', { name: /outubro de 2026/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Entradas' })).toHaveTextContent('+R$ 3.500,00')
    expect(screen.getByRole('group', { name: 'Saídas' })).toHaveTextContent('−R$ 123,45')
    expect(screen.getByRole('group', { name: 'Resultado' })).toHaveTextContent('R$ 3.376,55')
  })
})
