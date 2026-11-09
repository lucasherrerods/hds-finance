const RECUO_INICIAL = 12

/** O `clip-path` do bloco que abre com a rolagem, de recolhido (0) a aberto (1). */
export function recorteDaAbertura(progresso: number) {
  const t = Math.min(1, Math.max(0, progresso))
  const recuo = Math.round(RECUO_INICIAL * (1 - t) * 100) / 100
  return `inset(${recuo}% ${recuo}% ${recuo}% ${recuo}% round 24px)`
}
