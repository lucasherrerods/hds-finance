import { FilePlus2 } from 'lucide-react'
import { useId, useState, type ChangeEvent, type FormEvent } from 'react'
import { incluirArquivos, type ArquivoIncluido } from './lote'

type Props = {
  /** Recebe a frase do que aconteceu, para quem mostra o aviso recarregar o histórico. */
  aoImportar: (mensagem: string) => void
  className?: string
  rotulo?: string
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

function frase({ arquivo, resultado }: ArquivoIncluido, sozinho: boolean) {
  const nome = sozinho ? '' : `${arquivo.name}: `
  if (!resultado.ok) return `${nome}${resultado.mensagem}`
  const novas = plural(resultado.transacoesNovas, 'transação nova', 'transações novas')
  const repetidas = plural(resultado.duplicadas, 'já existia', 'já existiam')
  return `${nome}${novas}, ${repetidas}.${resultado.fechamento ? ` ${resultado.fechamento}` : ''}`
}

/** Inclui extratos (.ofx, .csv) e faturas do cartão (.pdf) no histórico do admin, vários de uma vez. */
export function AdicionarExtrato({ aoImportar, className = '', rotulo }: Props) {
  const id = useId()
  const idDaSenha = useId()
  const [importando, setImportando] = useState(false)
  const [erros, setErros] = useState<string[]>([])
  const [esperandoSenha, setEsperandoSenha] = useState<File[]>([])
  const [feitos, setFeitos] = useState<ArquivoIncluido[]>([])
  // A senha vive só enquanto a tela pede por ela.
  const [senha, setSenha] = useState('')
  const [senhaErrada, setSenhaErrada] = useState(false)

  async function incluir(arquivos: File[], anteriores: ArquivoIncluido[], senhaUsada: string) {
    setImportando(true)
    setErros([])
    const lote = await incluirArquivos(arquivos, senhaUsada)
    setImportando(false)
    setSenha('')

    const todos = [...anteriores, ...lote.incluidos]
    if (lote.semSenha.length > 0) {
      setFeitos(todos)
      setEsperandoSenha(lote.semSenha)
      setSenhaErrada(senhaUsada !== '')
      return
    }
    concluir(todos)
  }

  function concluir(todos: ArquivoIncluido[]) {
    setEsperandoSenha([])
    setFeitos([])
    setSenhaErrada(false)
    const sozinho = todos.length === 1
    setErros(todos.filter((t) => !t.resultado.ok).map((t) => frase(t, sozinho)))
    const certos = todos.filter((t) => t.resultado.ok)
    if (certos.length > 0) aoImportar(certos.map((t) => frase(t, sozinho)).join(' '))
  }

  function escolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(evento.target.files ?? [])]
    evento.target.value = ''
    if (arquivos.length > 0) void incluir(arquivos, [], '')
  }

  function enviarSenha(evento: FormEvent) {
    evento.preventDefault()
    void incluir(esperandoSenha, feitos, senha)
  }

  return (
    <div className="relative flex flex-col gap-2">
      <label htmlFor={id} aria-busy={importando} className={`flex cursor-pointer items-center gap-2 transition-colors ${className}`}>
        <FilePlus2 aria-hidden className="size-4" />
        {/* No cabeçalho do celular só cabe o ícone; com rótulo próprio, o texto fica. */}
        <span className={rotulo ? undefined : 'sr-only sm:not-sr-only'}>{importando ? 'Importando…' : (rotulo ?? 'Incluir extrato')}</span>
        <input id={id} type="file" multiple accept=".ofx,.csv,.pdf" onChange={escolher} disabled={importando} className="sr-only" />
      </label>

      {(esperandoSenha.length > 0 || erros.length > 0) && (
        <div className="fixed inset-x-4 top-20 z-30 flex flex-col gap-3 rounded-2xl border border-borda bg-superficie p-4 text-left text-base sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-80">
          {esperandoSenha.length > 0 && (
            <form onSubmit={enviarSenha} className="flex flex-col gap-3">
              <label htmlFor={idDaSenha}>
                Senha de {plural(esperandoSenha.length, 'fatura', 'faturas')}
              </label>
              <input
                id={idDaSenha}
                type="password"
                autoComplete="off"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full rounded-lg border border-borda bg-fundo px-4 py-2 outline-none focus-visible:border-primaria"
              />
              <p className="text-sm text-texto-suave">Serve só para abrir o PDF. Não fica guardada.</p>
              {senhaErrada && (
                <p role="alert" className="text-sm text-saida">
                  A senha não abriu {plural(esperandoSenha.length, 'fatura', 'faturas')}.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={importando}
                  className="rounded-full bg-primaria px-4 py-2 font-semibold text-primaria-texto disabled:opacity-50"
                >
                  Abrir
                </button>
                <button
                  type="button"
                  disabled={importando}
                  onClick={() => {
                    setSenha('')
                    concluir(feitos)
                  }}
                  className="rounded-full px-4 py-2 text-texto-suave hover:text-texto"
                >
                  Pular
                </button>
              </div>
            </form>
          )}
          {erros.length > 0 && (
            <div role="alert" className="flex max-h-60 flex-col gap-2 overflow-y-auto text-sm text-saida">
              {erros.map((erro) => (
                <p key={erro}>{erro}</p>
              ))}
              <button type="button" onClick={() => setErros([])} className="self-start text-texto-suave hover:text-texto">
                Fechar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
