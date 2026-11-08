import { EyeOff, FileX, KeyRound, type LucideIcon } from 'lucide-react'
import { Revelar } from '../../shared'
import { Secao } from './Secao'

const garantias: { icone: LucideIcon; titulo: string; texto: string }[] = [
  {
    icone: FileX,
    titulo: 'Nada é armazenado',
    texto: 'O extrato é lido em memória e descartado ao fim da requisição. Não há banco, cache nem arquivo temporário.',
  },
  {
    icone: EyeOff,
    titulo: 'Nada vai para os logs',
    texto: 'Os registros do servidor nunca contêm valores, descrições de transações ou trechos do arquivo.',
  },
  {
    icone: KeyRound,
    titulo: 'Sem senha do banco',
    texto: 'Você usa o arquivo que o próprio Inter exporta. Nunca pedimos login, senha ou token da sua conta.',
  },
]

export function Privacidade() {
  return (
    <Secao
      id="privacidade"
      titulo="Privacidade em primeiro lugar"
      descricao="Seus dados financeiros são seus. O hds-finance foi feito para nunca precisar guardá-los."
    >
      <ul className="grid gap-6 md:grid-cols-3">
        {garantias.map((garantia, indice) => (
          <li key={garantia.titulo}>
            <Revelar atraso={indice * 0.1} className="flex flex-col gap-3">
              <garantia.icone aria-hidden className="size-6 text-primaria opacity-80" />
              <h3 className="text-xl font-semibold tracking-tight">{garantia.titulo}</h3>
              <p className="text-texto-suave">{garantia.texto}</p>
            </Revelar>
          </li>
        ))}
      </ul>
    </Secao>
  )
}
