import { ArrowDownLeft, ArrowUpRight, Equal, HandCoins, Sigma, Trash2, Wallet, type LucideIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { AssistenteDoMes, EnviarFechamento } from '../../modules/admin'
import {
  Abas,
  CategoriasDoMes,
  InvestimentosDoPeriodo,
  FaturasDoCartao,
  GraficosDoPeriodo,
  indicadoresDoMes,
  PainelDoMes,
  periodoDosMeses,
  recortesDaEvolucao,
  SaldoDaConta,
  totaisDoPeriodo,
  TransacoesPorMes,
  type EdicaoDoHistorico,
  type Indicador,
} from '../../modules/dashboard'
import type { ResumoMensal } from '../../modules/import'
import { BaixarRelatorio, CompartilharMes } from '../../modules/report'
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
  const { arquivos, aoHistoricoMudar } = useDashboard()
  const ultimo = resumo.meses.at(-1)!

  return (
    <>
      <CabecalhoDaSecao
        sobretitulo="Visão geral"
        titulo={formatarMes(ultimo.ano, ultimo.mes)}
        descricao="O mês mais recente do extrato, comparado com o anterior."
      />
      {resumo.saldo && <SaldoDaConta saldo={resumo.saldo} />}
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
      {ultimo.emprestimos ? (
        <p className="flex items-start gap-2 text-texto-suave">
          <HandCoins aria-hidden className="mt-1 size-4 shrink-0 opacity-70" />
          {formatarMoeda(ultimo.emprestimos)} de empréstimo entraram na conta e não contam como receita.
        </p>
      ) : null}
      {resumo.painel && <PainelDoMes painel={resumo.painel} />}
      {!arquivos && <AssistenteDoMes mes={ultimo} aoAceitar={aoHistoricoMudar} />}
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
        descricao="Como entradas e saídas andaram mês a mês."
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
            {edicao?.aoApagarMes && (
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
              {edicao?.aoApagarMes && (
                <td className="py-3 pl-3 text-right">
                  <button
                    type="button"
                    aria-label={`Apagar ${formatarMesCurto(m.ano, m.mes)}`}
                    onClick={() => edicao.aoApagarMes?.({ ano: m.ano, mes: m.mes })}
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
          edicao?.aoApagar
            ? 'Escolha o período para ver cada lançamento. Troque a categoria, use o olho para tirar um lançamento das somas ou a lixeira para apagar.'
            : 'Escolha o período para ver cada lançamento. Troque a categoria ou use o olho para tirar um lançamento das somas. As mudanças somem ao fechar a aba.'
        }
      />
      <TransacoesPorMes meses={resumo.meses} transacoes={resumo.transacoes} edicao={edicao} />
    </>
  )
}

export function Investimentos() {
  const resumo = useResumo()
  const comMovimento = resumo.meses.some((m) => m.investimentos.aplicado > 0 || m.investimentos.resgatado > 0)

  return (
    <>
      <CabecalhoDaSecao
        sobretitulo={periodoDosMeses(resumo.meses)}
        titulo="Investimentos"
        descricao="O que saiu da conta para investir e o que voltou. O extrato da conta não traz rendimentos."
      />
      {comMovimento ? (
        <InvestimentosDoPeriodo meses={resumo.meses} transacoes={resumo.transacoes} />
      ) : (
        <SemDados>Nenhuma aplicação ou resgate neste extrato.</SemDados>
      )}
    </>
  )
}

export function Categorias() {
  const resumo = useResumo()

  return (
    <>
      <CabecalhoDaSecao
        sobretitulo={periodoDosMeses(resumo.meses)}
        titulo="Categorias"
        descricao="Os gastos do mês por grupo. Abra um grupo para ver as categorias dele."
      />
      <CategoriasDoMes meses={resumo.meses} />
    </>
  )
}

/** Só na área admin: a demonstração não lê fatura. */
export function CartaoDeCredito() {
  const { faturas = [] } = useResumo()

  return (
    <>
      <CabecalhoDaSecao
        sobretitulo={faturas.length === 1 ? '1 fatura' : `${faturas.length} faturas`}
        titulo="Cartões"
        descricao="Clique numa fatura para ver categorias e lançamentos. O pagamento é procurado no extrato da conta pelo valor e pela data."
      />
      {faturas.length === 0 ? (
        <SemDados>Nenhuma fatura incluída. Use "Incluir extrato" e escolha o PDF da fatura do Inter ou o CSV da fatura do Nubank.</SemDados>
      ) : (
        <FaturasDoCartao faturas={faturas} />
      )}
    </>
  )
}

export function Relatorio() {
  const { dados, arquivos, ajustes } = useDashboard()
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
            {arquivos ? 'O arquivo é montado na hora e não fica salvo no servidor.' : 'Montado a partir do seu histórico guardado.'}
          </p>
          <BaixarRelatorio arquivos={arquivos ?? undefined} ajustes={ajustes} mes={ultimo} />
        </section>
        <section aria-label="Compartilhar" className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-6">
          <h2 className="text-xl font-semibold tracking-tight">Compartilhar</h2>
          <p className="text-texto-suave">Abre o menu do seu aparelho. Onde ele não existe, o arquivo é baixado.</p>
          <CompartilharMes arquivos={arquivos ?? undefined} ajustes={ajustes} mes={ultimo} />
        </section>
        {!arquivos && (
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
