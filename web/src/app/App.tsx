import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { PaginaDoHistorico } from '../modules/history'
import { Cabecalho, Rodape } from '../modules/landing'
import { emModoPessoal } from '../shared'
import { PaginaDeTeste } from './PaginaDeTeste'
import { PaginaInicial } from './PaginaInicial'

export function App() {
  return (
    <>
      <RolarAoTrocarDePagina />
      <Cabecalho />
      <main>
        <Routes>
          <Route path="/" element={<PaginaInicial />} />
          <Route path="/testar" element={<PaginaDeTeste />} />
          {emModoPessoal() && <Route path="/historico" element={<PaginaDoHistorico />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Rodape />
    </>
  )
}

// Página nova começa do topo. Com âncora (/#exemplo), rola até a seção depois de ela existir:
// o navegador sozinho procura a âncora antes de o React desenhar a página e não acha.
function RolarAoTrocarDePagina() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
    else window.scrollTo({ top: 0 })
  }, [pathname, hash])
  return null
}
