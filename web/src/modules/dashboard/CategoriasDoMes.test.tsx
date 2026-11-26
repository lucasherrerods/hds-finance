import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ResumoMensal } from '../import'
import { CategoriasDoMes } from './CategoriasDoMes'

const outubro = {
  ano: 2026,
  mes: 10,
  gastosPorCategoria: [
    { categoria: 'Supermercado', grupo: 'Alimentação', valor: 300 },
    { categoria: 'Delivery de alimentos', grupo: 'Alimentação', valor: 100 },
  ],
} as unknown as ResumoMensal

describe('CategoriasDoMes', () => {
  it('clicar na categoria ou no atalho do grupo escolhe o filtro do mês', () => {
    const aoEscolher = vi.fn()
    render(<CategoriasDoMes meses={[outubro]} aoEscolher={aoEscolher} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ver transações de Supermercado' }))
    expect(aoEscolher).toHaveBeenLastCalledWith({ categoria: 'Supermercado' }, outubro)

    fireEvent.click(screen.getByRole('button', { name: 'Ver transações de Alimentação' }))
    expect(aoEscolher).toHaveBeenLastCalledWith({ grupo: 'Alimentação' }, outubro)
  })

  it('sem quem escute, as categorias não viram botão', () => {
    render(<CategoriasDoMes meses={[outubro]} />)

    expect(screen.queryByRole('button', { name: /Ver transações/ })).not.toBeInTheDocument()
  })
})
