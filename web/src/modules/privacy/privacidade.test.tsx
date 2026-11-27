import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AvisoDePrivacidade, PoliticaDePrivacidade } from '.'
import { pontos } from './pontos'

describe('privacidade', () => {
  it('avisa que nada é armazenado e abre a explicação', async () => {
    render(<AvisoDePrivacidade />, { wrapper: MemoryRouter })
    expect(screen.getByText(/nada é armazenado/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /como seus dados/i }))

    const modal = within(screen.getByRole('dialog'))
    for (const p of pontos) expect(modal.getByText(p.titulo)).toBeInTheDocument()
    expect(modal.getByRole('link', { name: /política completa/i })).toHaveAttribute('href', '/privacidade')

    fireEvent.click(modal.getByRole('button', { name: 'Fechar' }))
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('a política repete os pontos do modal e fala de quem hospeda', () => {
    render(<PoliticaDePrivacidade />)
    for (const p of pontos) expect(screen.getByRole('heading', { name: p.titulo })).toBeInTheDocument()
    expect(screen.getByText(/Vercel.*Render/)).toBeInTheDocument()
  })
})
