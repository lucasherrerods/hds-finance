import { useState } from 'react'
import { ResumoDoMes } from '../modules/dashboard'
import { AvisoDePrivacidade, EnvioDeExtrato, type ResumoDoExtrato } from '../modules/import'

export function App() {
  const [resumo, setResumo] = useState<ResumoDoExtrato | null>(null)

  return (
    <main className="mx-auto flex max-w-[70ch] flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl leading-tight font-semibold tracking-tight">hds-finance</h1>
        <p>Fechamento mensal a partir dos extratos do Banco Inter.</p>
        <AvisoDePrivacidade />
      </header>

      <EnvioDeExtrato aoResumir={setResumo} />

      {resumo && (
        <div className="flex flex-col gap-4">
          <p className="text-texto-suave">
            {resumo.transacoesNovas} transações lidas
            {resumo.duplicadas > 0 && `, ${resumo.duplicadas} duplicadas ignoradas`}.
          </p>
          {resumo.meses.map((mes) => (
            <ResumoDoMes key={`${mes.ano}-${mes.mes}`} mes={mes} />
          ))}
        </div>
      )}
    </main>
  )
}
