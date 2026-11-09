/** O modo pessoal roda só na máquina do dono, com a api lendo o histórico do SQLite. */
export const emModoPessoal = () => import.meta.env.VITE_MODO === 'pessoal'
