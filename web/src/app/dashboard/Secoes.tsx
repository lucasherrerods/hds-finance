import { ArrowDownLeft, ArrowUpRight, Equal, PiggyBank, Sigma, Trash2, Undo2, Wallet, type LucideIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { EnviarFechamento } from '../../modules/admin'
import {
  Abas,
  GraficosDoPeriodo,
  indicadoresDoMes,
  MesesPorAbas,
  PainelDoMes,
  periodoDosMeses,
  recortesDaEvolucao,
  totaisDoPeriodo,
  type EdicaoDoHistorico,
  type Indicador,
} from '../../modules/dashboard'
import type { ResumoMensal } from '../../modules/import'
import { BaixarRelatorio } from '../../modules/report'
import { formatarMes, formatarMesCurto, formatarMoeda, formatarMoedaComSinal } from '../../shared'
import { useDashboard } from './contextoDoDashboard'
import { CabecalhoDaSecao, CartaoDeNumero, SemDados } from './partes'

// O layout só desenha as seções quando há pelo menos um mês, então `meses.at(-1)` sempre existe.
const useResumo = () => useDashboard().dados

const iconeDoIndicador: Record<string, LucideIcon> = {
  Entrou: ArrowDownLeft,
  Saiu: ArrowUpRight,
  Sobrou: Equal,
  'Saldo final': Wallet,
}

function textoDo({ valor, tipo }: Indicador) {
  if (valor === null) return 'Não informado'
  return tipo === 'neutro' ? formatarMoeda(valor) : formatarMoedaComSinal(valor, tipo)
}

const corDo = ({ tipo }: Indicador) => (tipo === 'entrada' ? 'text-entrada' : tipo === 'saida' ? 'text-saida' : 'text-texto')

export function VisaoGeral() {
  const resumo = useResumo()
  const ultimo = resumo.meses.at(-1)!

  return (
    <>
      <CabecalhoDaSecao
        sobretitulo="Visão geral"
        titulo={formatarMes(ultimo.ano, ultimo.mes)}
        descricao="O mês mais recente do extrato, comparado com o anterior."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicadoresDoMes(resumo.meses).map((indicador) => (
          <CartaoDeNumero
            key={indicador.rotulo}
            rotulo={indicador.rotulo}
            icone={iconeDoIndicador[indicador.rotulo]}
            valor={textoDo(indicador)}
            cor={corDo(indicador)}
            variacao={indicador.variacao}
            subirEBom={indicador.tipo !== 'saida'}
          />
        ))}
      </div>
      {resumo.painel && <PainelDoMes painel={resumo.painel} />}
    </>
  )
}

export function Evolucao() {
  const { dados: resumo, edicao } = useDashboard()
  const [chave, setChave] = useState('recentes')
  const idDoPainel = useId()
  const recortes = recortesDaEvolucao(resumo.meses)
  // Se o ano escolhido sumir (o último mês dele foi apagado), volta para o recorte padrão.
  const recorte = recortes.find((r) => r.chave === chave) ?? recortes[0]
  const totais = totaisDoPeriodo(recorte.meses)
  const comAbas = recortes.length > 1

  return (
    <>
      <CabecalhoDaSecao
        sobretitulo={periodoDosMeses(recorte.meses)}
        titulo="Evolução"
        descricao="Como entradas, saídas e saldo andaram mês a mês."
      />
      {comAbas && (
        <Abas rotulo="Período da evolução" abas={recortes} selecionada={recorte.chave} aoSelecionar={setChave} idDoPainel={idDoPainel} />
      )}
      <div id={idDoPainel} role={comAbas ? 'tabpanel' : undefined} className="flex flex-col gap-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CartaoDeNumero rotulo="Entrou no período" icone={ArrowDownLeft} valor={formatarMoedaComSinal(totais.entradas, 'entrada')} cor="text-entrada" />
          <CartaoDeNumero rotulo="Saiu no período" icone={ArrowUpRight} valor={formatarMoedaComSinal(totais.saidas, 'saida')} cor="text-saida" />
          <CartaoDeNumero rotulo="Gasto médio por mês" icone={Sigma} valor={formatarMoeda(totais.mediaDeSaidas)} />
        </div>
        {recorte.meses.length < 2 ? (
          <SemDados>
            {comAbas
              ? 'Este período tem um mês só, então não há evolução para mostrar.'
              : 'Com um mês só não há evolução para mostrar. Exporte um período maior no app do Inter.'}
          </SemDados>
        ) : (
          <GraficosDoPeriodo meses={recorte.meses} />
        )}
        <TabelaDosMeses meses={recorte.meses} edicao={edicao} />
      </div>
    </>
  )
}

function TabelaDosMeses({ meses, edicao }: { meses: ResumoMensal[]; edicao?: EdicaoDoHistorico }) {
  return (
    <section aria-label="Resumo por mês" className="overflow-x-auto rounded-2xl border border-borda bg-superficie p-6">
      <table className="w-full min-w-[32rem] text-left tabular-nums">
        <thead className="text-sm text-texto-suave">
          <tr>
            <th className="pb-3 font-medium">Mês</th>
            <th className="pb-3 text-right font-medium">Entrou</th>
            <th className="pb-3 text-right font-medium">Saiu</th>
            <th className="pb-3 text-right font-medium">Sobrou</th>
            <th className="pb-3 text-right font-medium">Saldo final</th>
            {edicao && (
              <th className="pb-3">
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {meses.toReversed().map((m) => (
            <tr key={`${m.ano}-${m.mes}`} className="border-t border-borda">
              <td className="py-3">{formatarMesCurto(m.ano, m.mes)}</td>
              <td className="py-3 text-right text-entrada">{formatarMoedaComSinal(m.entradas, 'entrada')}</td>
              <td className="py-3 text-right text-saida">{formatarMoedaComSinal(m.saidas, 'saida')}</td>
              <td className="py-3 text-right">{formatarMoeda(m.resultado)}</td>
              <td className="py-3 text-right">{m.saldoFinal === null ? '—' : formatarMoeda(m.saldoFinal)}</td>
              {edicao && (
                <td className="py-3 pl-3 text-right">
                  <button
                    type="button"
                    aria-label={`Apagar ${formatarMesCurto(m.ano, m.mes)}`}
                    onClick={() => edicao.aoApagarMes({ ano: m.ano, mes: m.mes })}
                    className="inline-grid size-8 place-items-center rounded-full text-texto-suave transition-colors hover:bg-fundo hover:text-saida"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export function Transacoes() {
  const { dados: resumo, edicao } = useDashboard()

  return (
    <>
      <CabecalhoDaSecao
        sobretitulo={`${resumo.quantidade} transações`}
        titulo="Transações"
        descricao={
          edicao
            ? 'Escolha o mês para ver cada lançamento. Trocou a categoria de um, os iguais seguem a escolha daqui pra frente. A lixeira tira o lançamento do histórico.'
            : 'Escolha o mês para ver o fechamento, os gastos por categoria e cada lançamento.'
        }
      />
      <MesesPorAbas meses={resumo.meses} transacoes={resumo.transacoes} edicao={edicao} />
    </>
  )
}

export function Investimentos() {
  const resumo = useResumo()
  const totais = totaisDoPeriodo(resumo.meses)
  const comMovimento = resumo.meses.filter((m) => m.investimentos.aplicado > 0 || m.investimentos.resgatado > 0)

  return (
    <>
      <CabecalhoDaSecao
        sobretitulo={periodoDosMeses(resumo.meses)}
        titulo="Investimentos"
        descricao="O que saiu da conta para investir e o que voltou. O extrato da conta não traz rendimentos."
      />
      {comMovimento.length === 0 ? (
        <SemDados>Nenhuma aplicação ou resgate neste extrato.</SemDados>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CartaoDeNumero rotulo="Aplicado no período" icone={PiggyBank} valor={formatarMoeda(totais.aplicado)} />
            <CartaoDeNumero rotulo="Resgatado no período" icone={Undo2} valor={formatarMoeda(totais.resgatado)} />
            <CartaoDeNumero rotulo="Aplicado líquido" icone={Sigma} valor={formatarMoeda(totais.aplicadoAcumulado)} />
          </div>
          <section aria-label="Investimentos por mês" className="overflow-x-auto rounded-2xl border border-borda bg-superficie p-6">
            <table className="w-full min-w-[28rem] text-left tabular-nums">
              <thead className="text-sm text-texto-suave">
                <tr>
                  <th className="pb-3 font-medium">Mês</th>
                  <th className="pb-3 text-right font-medium">Aplicado</th>
                  <th className="pb-3 text-right font-medium">Resgatado</th>
                  <th className="pb-3 text-right font-medium">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {resumo.meses.toReversed().map((m) => (
                  <tr key={`${m.ano}-${m.mes}`} className="border-t border-borda">
                    <td className="py-3">{formatarMesCurto(m.ano, m.mes)}</td>
                    <td className="py-3 text-right">{formatarMoeda(m.investimentos.aplicado)}</td>
                    <td className="py-3 text-right">{formatarMoeda(m.investimentos.resgatado)}</td>
                    <td className="py-3 text-right">{formatarMoeda(m.investimentos.aplicadoAcumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  )
}

export function Relatorio() {
  const { dados, arquivo } = useDashboard()
  const ultimo = dados.meses.at(-1)!

  return (
    <>
      <CabecalhoDaSecao
        sobretitulo={formatarMes(ultimo.ano, ultimo.mes)}
        titulo="Relatório"
        descricao="O fechamento do mês em PDF, com resumo, evolução, categorias e investimentos."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-label="PDF do fechamento" className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-6">
          <h2 className="text-xl font-semibold tracking-tight">Baixar o PDF</h2>
          <p className="text-texto-suave">
            {arquivo ? 'O arquivo é montado na hora e não fica salvo no servidor.' : 'Montado a partir do seu histórico guardado.'}
          </p>
          <BaixarRelatorio arquivo={arquivo ?? undefined} mes={ultimo} />
        </section>
        {!arquivo && (
          <section aria-label="Enviar o fechamento" className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-6">
            <h2 className="text-xl font-semibold tracking-tight">Enviar por e-mail</h2>
            <p className="text-texto-suave">Vai para o seu e-mail. Um mês já enviado só sai de novo se você pedir.</p>
            <EnviarFechamento mes={ultimo} />
          </section>
        )}
      </div>
    </>
  )
}
