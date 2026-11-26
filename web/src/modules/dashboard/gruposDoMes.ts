import type { GastoPorCategoria } from '../import'

export type GrupoDoMes = { grupo: string; total: number; categorias: GastoPorCategoria[] }

const OUTROS = 'Outros'
const centavos = (valor: number) => Math.round(valor * 100) / 100

/** Junta os gastos do mês por grupo, do maior para o menor. Sem grupo informado, a categoria vai para "Outros". */
export function gruposDoMes(gastos: GastoPorCategoria[]): GrupoDoMes[] {
  const porGrupo = new Map<string, GastoPorCategoria[]>()
  for (const gasto of gastos) {
    const grupo = gasto.grupo ?? OUTROS
    porGrupo.set(grupo, [...(porGrupo.get(grupo) ?? []), gasto])
  }
  return [...porGrupo]
    .map(([grupo, categorias]) => ({
      grupo,
      total: centavos(categorias.reduce((s, c) => s + c.valor, 0)),
      categorias: categorias.toSorted((a, b) => b.valor - a.valor),
    }))
    .sort((a, b) => b.total - a.total)
}
