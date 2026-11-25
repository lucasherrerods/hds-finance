import { ChevronDown } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

type Props = ComponentProps<'select'> & { icone?: ReactNode; compacto?: boolean; fundo?: string }

/** O select do navegador com a nossa aparência: pílula, ícone opcional e seta própria. O teclado e o leitor de tela seguem nativos. */
export function Seletor({ icone, compacto = false, fundo = 'bg-fundo', className = '', children, ...resto }: Props) {
  const espaco = compacto ? 'h-8 pr-7 text-sm sm:pr-8' : 'h-10 w-full pr-10'
  const esquerda = icone ? (compacto ? 'pl-3 sm:pl-8' : 'pl-10') : 'pl-4'
  return (
    <span className={`relative inline-flex max-w-full items-center text-texto-suave transition-colors hover:text-texto ${className}`}>
      {icone && <span className={`pointer-events-none absolute left-3 opacity-70 ${compacto ? 'hidden sm:block' : ''}`}>{icone}</span>}
      <select
        {...resto}
        className={`max-w-full cursor-pointer appearance-none truncate rounded-full border border-borda ${fundo} transition-colors outline-none hover:border-primaria/40 focus-visible:border-primaria focus-visible:ring-2 focus-visible:ring-primaria/30 [&>option]:bg-superficie [&>option]:text-texto ${espaco} ${esquerda}`}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className={`pointer-events-none absolute size-4 opacity-70 ${compacto ? 'right-2 sm:right-2.5' : 'right-4'}`} />
    </span>
  )
}
