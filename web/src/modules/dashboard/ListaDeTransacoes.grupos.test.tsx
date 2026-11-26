import { render, screen, within } from '@testing-library/react'
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

    const seletor = screen.getByRole('combobox', { name: /categoria de mercado exemplo/i })
    expect(within(seletor).getAllByRole('group').map((g) => g.getAttribute('label'))).toEqual(['Alimentação', 'Transporte', 'Outros'])
    expect(within(seletor).getAllByRole('option')[0]).toHaveTextContent('Besteira')
  })
})
