import { createElement } from 'react'
import { iconeDaCategoria } from './iconesDeCategoria'

type Props = { categoria: string; className?: string }

export function IconeDaCategoria({ categoria, className }: Props) {
  return createElement(iconeDaCategoria(categoria), { 'aria-hidden': true, className })
}
