import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ListaDeTransacoes } from './ListaDeTransacoes'

describe('categoria agrupada', () => {
  it('separa as categorias por grupo, e a que não tem grupo fica solta no topo', () => {
    render(
      <ListaDeTransacoes
        transacoes={[{ data: '2026-11-05', descricao: 'Mercado Exemplo', categoria: 'Besteira', valor: -60 }]}
        totais={{ entradas: 0, saidas: 60, resultado: -60 }}
        edicao={{
          categorias: ['Supermercado', 'Delivery de alimentos', 'Combustível', 'Sem categoria'],
          grupos: [
            { nome: 'Alimentação', categorias: ['Supermercado', 'Delivery de alimentos'] },
            { nome: 'Transporte', categorias: ['Combustível'] },
            { nome: 'Outros', categorias: ['Sem categoria'] },
          ],
          aoMudar: vi.fn(),
          aoOcultar: vi.fn(),
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /detalhes de mercado exemplo/i }))
    fireEvent.click(screen.getByRole('button', { name: /categoria de mercado exemplo/i }))
    const lista = screen.getByRole('listbox')
    expect(within(lista).getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual(['Suas categorias', 'Alimentação', 'Transporte', 'Outros'])
    expect(within(lista).getAllByRole('option')[0]).toHaveTextContent('Besteira')
  })
})
