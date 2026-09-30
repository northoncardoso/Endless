import { describe, expect, it } from 'vitest'
import {
  CATALOGO_ITENS,
  CHANCE_DROP_GOBLIN,
  sortearDrop,
  sortearDrops,
} from '../itens'
import { criarSorteador, sortearInteiro, sortear } from '../random'

describe('catálogo de itens', () => {
  it('tem os 6 itens da spec', () => {
    expect(CATALOGO_ITENS).toHaveLength(6)
  })

  it('cada item dá de 1 a 3 em atributo, vida ou mana', () => {
    for (const item of CATALOGO_ITENS) {
      const entradas = Object.entries(item.bonus)
      expect(entradas.length).toBeGreaterThan(0)
      for (const [, valor] of entradas) {
        expect(valor).toBeGreaterThanOrEqual(1)
        expect(valor).toBeLessThanOrEqual(3)
      }
    }
  })

  it('não tem id repetido', () => {
    expect(new Set(CATALOGO_ITENS.map((item) => item.id)).size).toBe(6)
  })
})

describe('sorteador com semente', () => {
  it('a mesma semente devolve a mesma sequência', () => {
    const a = criarSorteador(42)
    const b = criarSorteador(42)
    const sequenciaA = Array.from({ length: 20 }, () => a())
    const sequenciaB = Array.from({ length: 20 }, () => b())

    expect(sequenciaA).toEqual(sequenciaB)
  })

  it('sementes diferentes devolvem sequências diferentes', () => {
    const sequenciaA = Array.from({ length: 20 }, criarSorteador(42))
    const sequenciaB = Array.from({ length: 20 }, criarSorteador(43))

    expect(sequenciaA).not.toEqual(sequenciaB)
  })

  it('sempre devolve valor entre 0 e 1', () => {
    const rng = criarSorteador(7)
    for (let i = 0; i < 1000; i += 1) {
      const valor = rng()
      expect(valor).toBeGreaterThanOrEqual(0)
      expect(valor).toBeLessThan(1)
    }
  })

  it('sortearInteiro fica dentro do intervalo, com as pontas incluídas', () => {
    const rng = criarSorteador(11)
    for (let i = 0; i < 1000; i += 1) {
      const valor = sortearInteiro(rng, 2, 5)
      expect([2, 3, 4, 5]).toContain(valor)
    }
  })

  it('sortear devolve sempre um elemento da lista', () => {
    const rng = criarSorteador(3)
    const lista = ['a', 'b', 'c'] as const
    for (let i = 0; i < 200; i += 1) {
      expect(lista).toContain(sortear(rng, lista))
    }
  })
})

describe('drop', () => {
  it('a mesma semente produz o mesmo drop, que é o que torna o teste útil', () => {
    const primeiro = sortearDrop(criarSorteador(99))
    const segundo = sortearDrop(criarSorteador(99))

    expect(primeiro).toEqual(segundo)
  })

  it('a semente muda o resultado em uma série longa', () => {
    const rngA = criarSorteador(1)
    const rngB = criarSorteador(2)
    const serieA = Array.from({ length: 200 }, () => sortearDrop(rngA))
    const serieB = Array.from({ length: 200 }, () => sortearDrop(rngB))

    expect(serieA).not.toEqual(serieB)
  })

  it('devolve null quando a chance não passa', () => {
    const nunca = () => CHANCE_DROP_GOBLIN + 0.01
    expect(sortearDrop(nunca)).toBeNull()
  })

  it('devolve sempre um item do catálogo quando a chance passa', () => {
    const sempre = () => 0
    const ids = new Set(CATALOGO_ITENS.map((item) => item.id))

    for (let i = 0; i < 200; i += 1) {
      const item = sortearDrop(sempre)
      expect(item).not.toBeNull()
      expect(ids.has(item?.id ?? '')).toBe(true)
    }
  })

  it('um drop por goblin derrotado', () => {
    const sempre = () => 0
    expect(sortearDrops(sempre, 2)).toHaveLength(2)
    expect(sortearDrops(sempre, 0)).toHaveLength(0)
  })
})