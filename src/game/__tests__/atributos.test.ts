import { describe, expect, it } from 'vitest'
import {
  bonusDe,
  comPonto,
  derivados,
  derivadosDoPersonagem,
  distribuicaoValida,
  pontosUsados,
  PONTOS_INICIAIS,
  VELOCIDADE_BASE,
  VELOCIDADE_POR_AGILIDADE,
  ZERO,
} from '../atributos'
import { CATALOGO_ITENS } from '../itens'
import type { Personagem } from '../tipos'

describe('derivados', () => {
  it('usa a fórmula da spec para os três atributos', () => {
    const d = derivados({ forca: 3, agilidade: 4, inteligencia: 5 })

    expect(d.vidaMaxima).toBe(50 + 3 * 8)
    expect(d.ataqueFisico).toBe(5 + 3 * 2)
    expect(d.ataqueDistancia).toBe(4 + 4 * 2)
    expect(d.danoMagico).toBe(6 + 5 * 3)
    expect(d.manaMaxima).toBe(20 + 5 * 5)
    expect(d.regeneracaoMana).toBe(5)
    expect(d.velocidadeMovimento).toBe(VELOCIDADE_BASE + 4 / VELOCIDADE_POR_AGILIDADE)
  })

  it('mantém a velocidade em tiles por segundo crescida com agilidade', () => {
    const lento = derivados({ forca: 0, agilidade: 0, inteligencia: 0 })
    const rapido = derivados({ forca: 0, agilidade: 12, inteligencia: 0 })

    expect(lento.velocidadeMovimento).toBe(2)
    expect(lento.velocidadeMovimento).toBeLessThan(rapido.velocidadeMovimento)
    expect(rapido.velocidadeMovimento).toBe(6)
  })

  it('soma o bônus do item no atributo antes da fórmula', () => {
    const semItem = derivados({ forca: 3, agilidade: 0, inteligencia: 0 })
    const comItem = derivados({ forca: 3, agilidade: 0, inteligencia: 0 }, { forca: 3 })

    expect(comItem.vidaMaxima).toBe(semItem.vidaMaxima + 3 * 8)
    expect(comItem.ataqueFisico).toBe(semItem.ataqueFisico + 3 * 2)
  })

  it('soma vida e mana direto, sem passar por atributo', () => {
    const base = derivados({ forca: 0, agilidade: 0, inteligencia: 0 })
    const comEquipamento = derivados(ZERO, { vida: 3, mana: 2 })

    expect(comEquipamento.vidaMaxima).toBe(base.vidaMaxima + 3)
    expect(comEquipamento.manaMaxima).toBe(base.manaMaxima + 2)
  })
})

describe('distribuição de pontos', () => {
  it('começa com os 12 pontos livres', () => {
    expect(PONTOS_INICIAIS).toBe(12)
    expect(pontosUsados(ZERO)).toBe(0)
  })

  it('soma um ponto por clique', () => {
    expect(comPonto(ZERO, 'forca')).toEqual({ forca: 1, agilidade: 0, inteligencia: 0 })
  })

  it('rejeita distribuição que passa dos 12 pontos', () => {
    expect(distribuicaoValida({ forca: 12, agilidade: 0, inteligencia: 0 }, 12)).toBe(true)
    expect(distribuicaoValida({ forca: 13, agilidade: 0, inteligencia: 0 }, 12)).toBe(false)
    expect(distribuicaoValida({ forca: -1, agilidade: 0, inteligencia: 0 }, 12)).toBe(false)
  })
})

describe('bonusEquipado', () => {
  function personagemComItens(itensEquipados: string[]): Personagem {
    return {
      nome: 'Herói',
      raca: 'humano',
      classe: 'cavaleiro',
      pontos: ZERO,
      itensEquipados,
      pontosLivres: 0,
    }
  }

  it('soma os bônus de todos os itens equipados', () => {
    const bonus = bonusDe(['espada-de-ferro', 'couraça-de-couro'], CATALOGO_ITENS)
    expect(bonus).toEqual({ forca: 3, vida: 3 })
  })

  it('ignora item que não existe no catálogo', () => {
    expect(bonusDe(['item-fantasma'], CATALOGO_ITENS)).toEqual({})
  })

  it('muda os derivados do personagem quando o item está equipado', () => {
    const sem = derivadosDoPersonagem(personagemComItens([]), CATALOGO_ITENS)
    const com = derivadosDoPersonagem(
      personagemComItens(['espada-de-ferro', 'couraça-de-couro']),
      CATALOGO_ITENS,
    )

    expect(com.vidaMaxima).toBe(sem.vidaMaxima + 24 + 3)
    expect(com.ataqueFisico).toBe(sem.ataqueFisico + 6)
  })
})