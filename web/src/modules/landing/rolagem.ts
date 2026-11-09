/** Qual passo ocupa a tela quando a seção presa já rolou `progresso` (de 0 a 1). */
export function passoDaRolagem(progresso: number, total: number) {
  return Math.min(total - 1, Math.max(0, Math.floor(progresso * total)))
}
