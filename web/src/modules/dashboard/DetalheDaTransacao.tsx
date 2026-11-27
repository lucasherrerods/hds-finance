import {
  Calendar,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  Repeat,
  Tag,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Dialogo,
  formatarData,
  formatarMoedaComSinal,
  IconeDoBanco,
} from "../../shared";
import type { TransacaoCategorizada } from "../import";
import { CategoriaDaTransacao } from "./CategoriaDaTransacao";
import { IconeDaCategoria } from "./IconeDaCategoria";
import { tomDaCategoria } from "./iconesDeCategoria";
import type { EdicaoDoHistorico } from "./ListaDeTransacoes";
import { semelhantes } from "./semelhantes";

type Props = {
  transacao: TransacaoCategorizada;
  /** Já está na tela: as semelhantes saem daqui, sem nova chamada à api. */
  historico: TransacaoCategorizada[];
  edicao?: EdicaoDoHistorico;
  aoEscolher: (transacao: TransacaoCategorizada) => void;
  aoFechar: () => void;
};

export function DetalheDaTransacao({
  transacao,
  historico,
  edicao,
  aoEscolher,
  aoFechar,
}: Props) {
  // Depois de trocar a categoria ou ocultar, a lista chega nova: mostra a versão atual da mesma transação.
  const t =
    (transacao.chave && historico.find((h) => h.chave === transacao.chave)) ||
    transacao;
  const entrada = t.valor > 0;
  const banco = t.banco ?? "Inter";
  const parecidas = semelhantes(t, historico);

  return (
    <Dialogo
      rotulo="Detalhes da transação"
      aoFechar={aoFechar}
      className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg rounded-2xl border"
      cabecalho={
        <h2 className="text-lg font-semibold tracking-tight">
          Detalhes da transação
        </h2>
      }
    >
      <div className="flex items-start gap-4">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-xl ${tomDaCategoria(t.categoria, t.grupo)}`}
        >
          <IconeDaCategoria
            categoria={t.categoria}
            grupo={t.grupo}
            className="size-5 opacity-70"
          />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-semibold break-words">{t.descricao}</span>
          <span
            className={`text-2xl font-bold tracking-tight tabular-nums ${t.oculta ? "text-texto-suave line-through" : entrada ? "text-entrada" : ""}`}
          >
            {formatarMoedaComSinal(t.valor, entrada ? "entrada" : "saida")}
          </span>
          {t.oculta && (
            <span className="text-sm text-texto-suave">Fora da soma</span>
          )}
        </span>
      </div>

      <dl className="flex flex-col gap-3">
        <Dado icone={Calendar} rotulo="Data">
          {formatarData(t.data)}
        </Dado>
        <Dado icone={Landmark} rotulo="Conta">
          <span className="flex items-center gap-2">
            <IconeDoBanco banco={banco} pequeno />
            {banco}
            {t.noCartao && (
              <span className="flex items-center gap-1 text-sm text-texto-suave">
                <CreditCard aria-hidden className="size-3.5 opacity-70" />
                Cartão
              </span>
            )}
          </span>
        </Dado>
        <Dado icone={Tag} rotulo="Categoria">
          {/* Fecha ao trocar: o aviso com "aplicar a todas as iguais" fica atrás do diálogo. */}
          <CategoriaDaTransacao
            transacao={t}
            edicao={edicao}
            aoMudar={aoFechar}
          />
        </Dado>
      </dl>

      {edicao && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => edicao.aoOcultar(t, !t.oculta)}
            className="flex items-center gap-2 rounded-full border border-borda px-4 py-2 text-sm transition-colors hover:border-primaria"
          >
            {t.oculta ? (
              <Eye aria-hidden className="size-4 opacity-70" />
            ) : (
              <EyeOff aria-hidden className="size-4 opacity-70" />
            )}
            {t.oculta ? "Mostrar" : "Ocultar"}
          </button>
          {edicao.aoApagar && (
            <button
              type="button"
              onClick={() => {
                edicao.aoApagar?.(t);
                aoFechar();
              }}
              className="flex items-center gap-2 rounded-full border border-borda px-4 py-2 text-sm transition-colors hover:border-saida hover:text-saida"
            >
              <Trash2 aria-hidden className="size-4 opacity-70" />
              Apagar
            </button>
          )}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-sm text-texto-suave">
          <Repeat aria-hidden className="size-4 opacity-70" />
          Transações semelhantes
        </h3>
        {parecidas.length === 0 ? (
          <p className="py-4 text-center text-sm text-texto-suave">
            Nenhuma transação semelhante encontrada.
          </p>
        ) : (
          <ul
            aria-label="Transações semelhantes"
            className="flex flex-col gap-2"
          >
            {parecidas.map((p, i) => (
              <li key={p.chave ?? `${p.data}-${i}`}>
                <button
                  type="button"
                  onClick={() => aoEscolher(p)}
                  className="flex w-full items-center gap-3 rounded-xl bg-fundo p-3 text-left transition-colors hover:bg-borda/40"
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg ${tomDaCategoria(p.categoria, p.grupo)}`}
                  >
                    <IconeDaCategoria
                      categoria={p.categoria}
                      grupo={p.grupo}
                      className="size-4 opacity-70"
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate" title={p.descricao}>
                      {p.descricao}
                    </span>
                    <span className="text-sm text-texto-suave">
                      {formatarData(p.data)} · {p.categoria}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-semibold tabular-nums ${p.oculta ? "text-texto-suave line-through" : p.valor > 0 ? "text-entrada" : ""}`}
                  >
                    {formatarMoedaComSinal(
                      p.valor,
                      p.valor > 0 ? "entrada" : "saida",
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Dialogo>
  );
}

function Dado({
  icone: Icone,
  rotulo,
  children,
}: {
  icone: LucideIcon;
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-texto-suave">
        <Icone aria-hidden className="size-4 opacity-70" />
        {rotulo}
      </dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}
