import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AvisoDePrivacidade } from './AvisoDePrivacidade'

describe('AvisoDePrivacidade', () => {
  it('avisa que nada é armazenado', () => {
    render(<AvisoDePrivacidade />)
    expect(screen.getByText(/nada é armazenado/i)).toBeInTheDocument()
  })
})
