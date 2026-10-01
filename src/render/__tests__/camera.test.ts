import { describe, expect, it } from 'vitest'
import { criarMapa } from '../../game/mundo'
import {
  limitarAoMundo,
  seguirHeroi,
  tamanhoDoMundo,
  ZONA_MORTA_PADRAO,
} from '../camera'

const MAPA = criarMapa()

function mundo() {
  return tamanhoDoMundo(MAPA)
}

describe('zona morta', () => {
  it('não mexe a câmera com o herói dentro da zona', () => {
    const centro = { x: 100, y: 100 }
    const heroi = { x: 100 + ZONA_MORTA_PADRAO.largura / 2 - 1, y: 100 }

    expect(seguirHeroi(centro, heroi, { mundo: mundo() })).toEqual(centro)
  })

  it('a câmera põe o herói na borda da zona quando ele passa dela', () => {
    const centro = { x: 100, y: 100 }
    const heroi = { x: 100 + ZONA_MORTA_PADRAO.largura / 2 + 20, y: 100 }

    const novo = seguirHeroi(centro, heroi, { mundo: mundo() })

    expect(novo.x).toBe(heroi.x - ZONA_MORTA_PADRAO.largura / 2)
    expect(novo.y).toBe(centro.y)
  })

  it('não treme: devolver o mesmo herói não muda a câmera', () => {
    const opcoes = { mundo: mundo() }
    const heroi = { x: 300, y: 200 }

    const primeiro = seguirHeroi({ x: 10, y: 10 }, heroi, opcoes)
    const segundo = seguirHeroi(primeiro, heroi, opcoes)

    expect(segundo).toEqual(primeiro)
  })

  it('devolve objeto novo, para o quadro anterior não ser alterado', () => {
    const centro = { x: 10, y: 10 }

    seguirHeroi(centro, { x: 500, y: 500 }, { mundo: mundo() })

    expect(centro).toEqual({ x: 10, y: 10 })
  })

  it('funciona com zona morta de tamanho diferente do padrão', () => {
    const zona = { largura: 100, altura: 100 }
    const heroi = { x: 200, y: 200 }

    const novo = seguirHeroi({ x: 100, y: 100 }, heroi, { mundo: mundo(), zonaMorta: zona })

    expect(novo.x).toBe(150)
    expect(novo.y).toBe(150)
  })
})

describe('limite do mapa', () => {
  it('não deixa a câmera mostrar fora do mapa', () => {
    const tamanho = mundo()

    const novo = limitarAoMundo({ x: -500, y: -500 }, tamanho)

    expect(novo.x).toBe(ZONA_MORTA_PADRAO.largura / 2)
    expect(novo.y).toBe(ZONA_MORTA_PADRAO.altura / 2)
  })

  it('não deixa a câmera passar da borda de baixo e da direita', () => {
    const tamanho = mundo()

    const novo = limitarAoMundo({ x: 99_999, y: 99_999 }, tamanho)

    expect(novo.x).toBe(tamanho.largura - ZONA_MORTA_PADRAO.largura / 2)
    expect(novo.y).toBe(tamanho.altura - ZONA_MORTA_PADRAO.altura / 2)
  })

  it('mapa menor que a zona morta fica centralizado', () => {
    const pequeno = { largura: 20, altura: 10 }

    expect(limitarAoMundo({ x: 0, y: 0 }, pequeno)).toEqual({ x: 10, y: 5 })
  })

  it('o herói não consegue empurrar a câmera para fora do mapa', () => {
    const tamanho = mundo()
    const heroiNoCanto = { x: 0, y: 0 }

    const novo = seguirHeroi({ x: 0, y: 0 }, heroiNoCanto, { mundo: tamanho })

    expect(novo.x).toBeGreaterThan(0)
    expect(novo.y).toBeGreaterThan(0)
  })
})

describe('tamanho do mundo', () => {
  it('vem do mapa em tiles, com 16 pixels por tile', () => {
    expect(tamanhoDoMundo(MAPA)).toEqual({ largura: MAPA.largura * 16, altura: MAPA.altura * 16 })
  })
})
