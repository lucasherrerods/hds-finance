import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { Cabecalho, Rodape } from '../modules/landing'
import { emModoPessoal } from '../shared'
import { LayoutDoDashboard } from './dashboard/LayoutDoDashboard'
import { Evolucao, Investimentos, Relatorio, Transacoes, VisaoGeral } from './dashboard/Secoes'
import { PaginaDeTeste } from './PaginaDeTeste'
import { PaginaInicial } from './PaginaInicial'
import { ProvedorDoResultado } from './resultado'

export function App() {
  return (
    <ProvedorDoResultado>
      <RolarAoTrocarDePagina />
      <Routes>
        <Route element={<LayoutDoSite />}>
          <Route path="/" element={<PaginaInicial />} />
          {/* No modo pessoal o histórico já está guardado: o caminho de envio é o "Adicionar extrato" do dashboard. */}
          <Route path="/testar" element={emModoPessoal() ? <Navigate to="/dashboard" replace /> : <PaginaDeTeste />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="/dashboard" element={<LayoutDoDashboard />}>
          <Route index element={<VisaoGeral />} />
          <Route path="evolucao" element={<Evolucao />} />
          <Route path="transacoes" element={<Transacoes />} />
          <Route path="investimentos" element={<Investimentos />} />
          <Route path="relatorio" element={<Relatorio />} />
        </Route>
      </Routes>
    </ProvedorDoResultado>
  )
}

function LayoutDoSite() {
  return (
    <>
      <Cabecalho />
      <main>
        <Outlet />
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
