import { sortearInteiro, type Sorteador } from './random'
import type { Item } from './tipos'

export const CATALOGO_ITENS: readonly Item[] = [
  { id: 'espada-de-ferro', nome: 'Espada de ferro', bonus: { forca: 3 } },
  { id: 'arco-de-caça', nome: 'Arco de caça', bonus: { agilidade: 2 } },
  { id: 'varinha-de-carvalho', nome: 'Varinha de carvalho', bonus: { inteligencia: 3 } },
  { id: 'couraça-de-couro', nome: 'Couraça de couro', bonus: { vida: 3 } },
  { id: 'amuleto-de-pedra', nome: 'Amuleto de pedra', bonus: { inteligencia: 1 } },
  { id: 'poção-de-luz', nome: 'Poção de luz', bonus: { mana: 2 } },
]

export const CHANCE_DROP_GOBLIN = 0.6

export function buscarItem(id: string): Item | undefined {
  return CATALOGO_ITENS.find((item) => item.id === id)
}

export function sortearDrop(rng: Sorteador): Item | null {
  if (rng() >= CHANCE_DROP_GOBLIN) return null
  const indice = sortearInteiro(rng, 0, CATALOGO_ITENS.length - 1)
  return CATALOGO_ITENS[indice] ?? null
}

export function sortearDrops(rng: Sorteador, quantidade: number): Item[] {
  const drops: Item[] = []
  for (let i = 0; i < quantidade; i += 1) {
    const item = sortearDrop(rng)
    if (item !== null) drops.push(item)
  }
  return drops
}