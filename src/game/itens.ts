import { sortear, sortearInteiro, type Sorteador } from './random'
import type { Consumivel, Item, ItemDaBag } from './tipos'

export const CATALOGO_ITENS: readonly Item[] = [
  { id: 'espada-de-ferro', nome: 'Espada de ferro', bonus: { forca: 3 }, tipo: 'arma', slot: 'arma', requeridoClasse: 'cavaleiro' },
  { id: 'arco-de-caça', nome: 'Arco de caça', bonus: { agilidade: 2 }, tipo: 'ambos', slot: 'arma', requeridoClasse: 'arqueiro' },
  { id: 'varinha-de-carvalho', nome: 'Varinha de carvalho', bonus: { inteligencia: 3 }, tipo: 'arma', slot: 'arma', requeridoClasse: 'mago' },
  { id: 'couraça-de-couro', nome: 'Couraça de couro', bonus: { vida: 3 }, tipo: 'torso', slot: 'torso', requeridoClasse: 'qualquer' },
  { id: 'amuleto-de-pedra', nome: 'Amuleto de pedra', bonus: { inteligencia: 1 }, tipo: 'colar', slot: 'colar', requeridoClasse: 'qualquer' },
  { id: 'poção-de-luz', nome: 'Poção de luz', bonus: { mana: 2 }, tipo: 'torso', slot: 'torso', requeridoClasse: 'qualquer' },
]

export const CHANCE_DROP_GOBLIN = 0.6

// Consumíveis não equipam. Ficam num catálogo separado do de atributos, porque
// a soma é em vida e o efeito é na hora, não em derivado.
export const CATALOGO_CONSUMIVEIS: readonly Consumivel[] = [
  { id: 'gota-de-mel', nome: 'Gota de mel', cura: 5 },
  { id: 'pao-de-viagem', nome: 'Pão de viagem', cura: 10 },
  { id: 'sopa-de-raiz', nome: 'Sopa de raiz', cura: 20 },
]

export function buscarItem(id: string): Item | undefined {
  return CATALOGO_ITENS.find((item) => item.id === id)
}

export function buscarConsumivel(id: string): Consumivel | undefined {
  return CATALOGO_CONSUMIVEIS.find((item) => item.id === id)
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

// O drop do goblin pode ser equipamento ou comida. A chance é a mesma do
// equipamento, e o sorteio entre os dois catálogos é o que dá a surpresa boa.
const CHANCE_CONSUMIVEL = 0.35

export function sortearDropDeGoblin(rng: Sorteador): ItemDaBag | null {
  if (rng() >= CHANCE_DROP_GOBLIN) return null
  if (rng() < CHANCE_CONSUMIVEL) {
    return sortear(rng, CATALOGO_CONSUMIVEIS)
  }
  return CATALOGO_ITENS[sortearInteiro(rng, 0, CATALOGO_ITENS.length - 1)] ?? null
}