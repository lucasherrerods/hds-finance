import { Wallet } from 'lucide-react'
import { Link } from 'react-router'
import { BotaoDeTema, emModoPessoal } from '../../shared'

const secoes = [
  { href: '/#como-usar', rotulo: 'Como usar' },
  { href: '/#exemplo', rotulo: 'Exemplo' },
  { href: '/#privacidade', rotulo: 'Privacidade' },
]

export function Cabecalho() {
  return (
    <header className="sticky top-0 z-10 bg-fundo/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Wallet aria-hidden className="size-5 text-primaria" />
          hds finance
        </Link>

        <nav aria-label="Seções" className="hidden items-center gap-8 md:flex">
          {secoes.map((secao) => (
            <Link key={secao.href} to={secao.href} className="text-texto-suave transition-colors hover:text-texto">
              {secao.rotulo}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <BotaoDeTema />
          <Link
            to={emModoPessoal() ? '/dashboard' : '/testar'}
            className="rounded-lg bg-primaria px-4 py-2 font-medium text-primaria-texto transition-transform hover:-translate-y-0.5"
          >
            {emModoPessoal() ? 'Ver dashboard' : 'Testar'}
          </Link>
        </div>
      </div>
    </header>
  )
}
