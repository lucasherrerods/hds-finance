export type NomeDoBanco = 'Inter' | 'Nubank'

const selos = {
  Inter: { texto: 'inter', cores: 'bg-inter text-inter-texto' },
  Nubank: { texto: 'nu', cores: 'bg-nubank text-nubank-texto' },
}

/** Selo com o nome do banco, só para identificar a conta. Não é a logo oficial. */
export function IconeDoBanco({ banco, pequeno = false }: { banco: NomeDoBanco; pequeno?: boolean }) {
  const { texto, cores } = selos[banco]
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center font-bold tracking-tight ${cores} ${pequeno ? 'size-6 rounded-md text-[8px]' : 'size-12 rounded-xl text-sm'}`}
    >
      {texto}
    </span>
  )
}
