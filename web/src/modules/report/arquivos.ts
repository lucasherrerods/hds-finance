import type { Ajuste } from '../import'
import { baixarRelatorio, baixarRelatorioDoHistorico, type MesDoRelatorio } from './api'

const sufixo = ({ ano, mes }: MesDoRelatorio) => `${ano}-${String(mes).padStart(2, '0')}`

export const nomeDoPdf = (mes: MesDoRelatorio) => `fechamento-${sufixo(mes)}.pdf`
export const nomeDaImagem = (mes: MesDoRelatorio) => `resumo-${sufixo(mes)}.png`

export function gerarPdf(mes: MesDoRelatorio, arquivos?: File[], ajustes: Ajuste[] = []) {
  return arquivos ? baixarRelatorio(arquivos, mes, ajustes) : baixarRelatorioDoHistorico(mes)
}

export function salvar(conteudo: Blob, nome: string) {
  const endereco = URL.createObjectURL(conteudo)
  const link = document.createElement('a')
  link.href = endereco
  link.download = nome
  link.click()
  URL.revokeObjectURL(endereco)
}

export type Entrega = 'compartilhado' | 'baixado' | 'cancelado' | 'precisa-de-toque'

/**
 * Menu de compartilhar do aparelho ou, onde ele não existe, download. O navegador só abre o menu logo depois de
 * um toque: se o arquivo demorou, o chamador guarda e pede outro.
 */
export async function entregar(arquivo: File): Promise<Entrega> {
  if (!navigator.canShare?.({ files: [arquivo] })) {
    salvar(arquivo, arquivo.name)
    return 'baixado'
  }

  try {
    await navigator.share({ files: [arquivo] })
    return 'compartilhado'
  } catch (erro) {
    const nome = (erro as Error).name
    if (nome === 'AbortError') return 'cancelado'
    if (nome === 'NotAllowedError') return 'precisa-de-toque'
    salvar(arquivo, arquivo.name)
    return 'baixado'
  }
}
