import { AvisoDePrivacidade } from '../modules/importacao'

export function App() {
  return (
    <main className="mx-auto flex max-w-[70ch] flex-col gap-6 px-6 py-16">
      <h1 className="text-4xl leading-tight font-semibold tracking-tight">hds-finance</h1>
      <p>Fechamento mensal a partir dos extratos do Banco Inter.</p>
      <AvisoDePrivacidade />
    </main>
  )
}
