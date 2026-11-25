import { ChevronLeft, ChevronRight, CreditCard } from 'lucide-react'
import { useId, useState } from 'react'
import { formatarData, formatarMes, formatarMesCurto, formatarMoeda, formatarMoedaCompacta, IconeDoBanco, type NomeDoBanco } from '../../shared'
import { Cartao } from './Cartao'
import { DetalheDaFatura } from './DetalheDaFatura'
import { bancoDaFatura, chaveDaFatura, janelaDeFaturas, mesDaFatura, ultimaDeCadaBanco, valorDaFatura, type Fatura } from './faturas'
import { Seletor } from './Seletor'
import { Seta } from './Seta'
import { Situacao } from './Situacao'

/** A fatura mais nova em destaque, um cartão por banco e o gráfico das faturas. Cada uma abre num painel lateral. */
export function FaturasDoCartao({ faturas }: { faturas: Fatura[] }) {
  const [aberta, setAberta] = useState<string | null>(null)
  const abrir = (f: Fatura) => setAberta(chaveDaFatura(f))
  const cartoes = ultimaDeCadaBanco(faturas)
  const emDetalhe = faturas.find((f) => chaveDaFatura(f) === aberta)
  const maisNova = faturas[0]
  if (!maisNova) return null

  return (
    <div className="flex flex-col gap-8">
      <section
        aria-label="Fatura mais recente"
        className="flex flex-col items-center gap-2 rounded-2xl border border-borda bg-linear-to-b from-primaria-suave to-superficie px-6 py-8 text-center"
      >
        <span className="flex items-center gap-2 text-texto-suave">
          <CreditCard aria-hidden className="size-4 opacity-70" />
          Fatura mais recente
        </span>
        <span className="text-4xl leading-tight font-bold tracking-[-0.03em] tabular-nums sm:text-5xl">{formatarMoeda(valorDaFatura(maisNova))}</span>
        <span className="text-texto-suave">Vencimento em {formatarData(maisNova.vencimento)}</span>
        <Situacao paga={maisNova.paga} />
      </section>

      <section aria-label="Seus cartões" className="flex flex-col gap-4">
        <h2 className="font-semibold">
          Seus cartões <span className="font-normal text-texto-suave">({cartoes.length})</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {cartoes.map((f) => (
            <CartaoDoBanco key={bancoDaFatura(f)} fatura={f} quantas={faturas.filter((o) => bancoDaFatura(o) === bancoDaFatura(f)).length} aoAbrir={() => abrir(f)} />
          ))}
        </div>
      </section>

      <GraficoDeFaturas faturas={faturas} bancos={cartoes.map(bancoDaFatura)} aberta={aberta} aoAbrir={abrir} />

      {emDetalhe && <DetalheDaFatura fatura={emDetalhe} aoFechar={() => setAberta(null)} />}
    </div>
  )
}

function CartaoDoBanco({ fatura, quantas, aoAbrir }: { fatura: Fatura; quantas: number; aoAbrir: () => void }) {
  const banco = bancoDaFatura(fatura)
  return (
    <button
      type="button"
      onClick={aoAbrir}
      className="relative isolate flex flex-col gap-4 overflow-hidden rounded-2xl border border-borda bg-superficie p-6 text-left transition-colors hover:border-primaria/40"
    >
      <span aria-hidden className="absolute -top-16 -right-12 -z-10 size-44 rounded-full bg-primaria-suave opacity-60" />
      <span className="flex items-center gap-4">
        <IconeDoBanco banco={banco} />
        <span className="flex flex-col">
          <span className="text-lg font-semibold tracking-tight">Cartão {banco}</span>
          <span className="text-sm text-texto-suave">{quantas === 1 ? '1 fatura incluída' : `${quantas} faturas incluídas`}</span>
        </span>
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-sm text-texto-suave">Última fatura</span>
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{formatarMoeda(valorDaFatura(fatura))}</span>
      </span>
      <span className="flex flex-wrap items-center justify-between gap-2 border-t border-borda pt-4 text-sm text-texto-suave">
        Vencimento em {formatarData(fatura.vencimento)}
        <Situacao paga={fatura.paga} />
      </span>
    </button>
  )
}

type GraficoProps = { faturas: Fatura[]; bancos: NomeDoBanco[]; aberta: string | null; aoAbrir: (f: Fatura) => void }

function GraficoDeFaturas({ faturas, bancos, aberta, aoAbrir }: GraficoProps) {
  const [escolhido, setEscolhido] = useState(bancos[0])
  const [pagina, setPagina] = useState(0)
  const idDoBanco = useId()
  const banco = bancos.includes(escolhido) ? escolhido : bancos[0]
  const doBanco = faturas.filter((f) => bancoDaFatura(f) === banco)
  const janela = janelaDeFaturas(doBanco, pagina)
  const maior = Math.max(1, ...janela.faturas.map(valorDaFatura))
  const mesCurto = (f: Fatura) => formatarMesCurto(...(mesDaFatura(f).slice(0, 2) as [number, number]))
  const [primeira, ultima] = [janela.faturas.at(0), janela.faturas.at(-1)]

  return (
    <Cartao titulo="Faturas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {bancos.length > 1 ? (
          <>
            <label htmlFor={idDoBanco} className="sr-only">
              Cartão do gráfico
            </label>
            <Seletor
              id={idDoBanco}
              value={banco}
              onChange={(e) => {
                setEscolhido(e.target.value as NomeDoBanco)
                setPagina(0)
              }}
            >
              {bancos.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </Seletor>
          </>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          <Seta rotulo="Faturas anteriores" icone={ChevronLeft} ativa={janela.temAntes} aoClicar={() => setPagina(pagina + 1)} />
          <span className="min-w-36 text-center tabular-nums">{primeira && ultima && (primeira === ultima ? mesCurto(primeira) : `${mesCurto(primeira)} – ${mesCurto(ultima)}`)}</span>
          <Seta rotulo="Faturas seguintes" icone={ChevronRight} ativa={janela.temDepois} aoClicar={() => setPagina(pagina - 1)} />
        </div>
      </div>

      <ul aria-label="Faturas do período" className="grid grid-cols-6 gap-2 sm:gap-4">
        {janela.faturas.map((f) => {
          const [ano, mes] = mesDaFatura(f)
          const chave = chaveDaFatura(f)
          return (
            <li key={chave} className="min-w-0">
              <button
                type="button"
                aria-label={`Fatura de ${formatarMes(ano, mes)}, ${formatarMoeda(valorDaFatura(f))}`}
                onClick={() => aoAbrir(f)}
                className="group flex w-full flex-col items-center gap-2 rounded-xl py-2"
              >
                <span className="flex h-48 w-full flex-col items-center justify-end gap-2">
                  <span className="hidden text-sm whitespace-nowrap text-texto-suave tabular-nums sm:inline">{formatarMoedaCompacta(valorDaFatura(f))}</span>
                  <span
                    className={`w-full max-w-20 rounded-lg transition-colors ${
                      chave === aberta || f === doBanco[0] ? 'bg-primaria' : 'bg-primaria/25 group-hover:bg-primaria/50'
                    }`}
                    style={{ height: `${Math.max(2, (valorDaFatura(f) / maior) * 80)}%` }}
                  />
                </span>
                <span className="text-sm text-texto-suave">{mesCurto(f)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Cartao>
  )
}
