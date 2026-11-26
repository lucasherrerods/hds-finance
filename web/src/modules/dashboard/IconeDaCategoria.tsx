import { createElement } from 'react'
import { iconeDaCategoria } from './iconesDeCategoria'

type Props = { categoria: string; grupo?: string; className?: string }

export function IconeDaCategoria({ categoria, grupo, className }: Props) {
  return createElement(iconeDaCategoria(categoria, grupo), { 'aria-hidden': true, className })
}
