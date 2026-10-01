import { describe, expect, it } from 'vitest'
import { acaoDeTecla, direcaoDasTeclas, ehTeclaDeMovimento } from '../teclado'

describe('teclas de movimento', () => {
  it('WASD e as setas são teclas de movimento', () => {
    for (const code of ['KeyA', 'KeyW', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight']) {
      expect(ehTeclaDeMovimento(code)).toBe(true)
    }
  })

  it('E, Enter, Espaço e Esc não são tecla de movimento', () => {
    for (const code of ['KeyE', 'Enter', 'Space', 'Escape']) {
      expect(ehTeclaDeMovimento(code)).toBe(false)
    }
  })

  it('nenhuma tecla pressionada é parar', () => {
    expect(direcaoDasTeclas(new Set())).toBeNull()
  })

  it('cada tecla dá a direção esperada', () => {
    expect(direcaoDasTeclas(new Set(['KeyA']))).toBe('esquerda')
    expect(direcaoDasTeclas(new Set(['KeyD']))).toBe('direita')
    expect(direcaoDasTeclas(new Set(['KeyW']))).toBe('cima')
    expect(direcaoDasTeclas(new Set(['KeyS']))).toBe('baixo')
    expect(direcaoDasTeclas(new Set(['ArrowLeft']))).toBe('esquerda')
    expect(direcaoDasTeclas(new Set(['ArrowUp']))).toBe('cima')
  })

  it('soltar a tecla faz o herói parar', () => {
    const pressionada = new Set(['KeyA'])
    expect(direcaoDasTeclas(pressionada)).toBe('esquerda')

    pressionada.delete('KeyA')
    expect(direcaoDasTeclas(pressionada)).toBeNull()
  })

  it('duas teclas opostas não trocam de direção a cada quadro', () => {
    // A ordem é fixa de propósito. Sem isso, andar na diagonal com as duas mãos
    // tremia entre esquerda e direita.
    expect(direcaoDasTeclas(new Set(['KeyD', 'KeyA']))).toBe('esquerda')
    expect(direcaoDasTeclas(new Set(['KeyA', 'KeyD']))).toBe('esquerda')
    expect(direcaoDasTeclas(new Set(['KeyS', 'KeyW']))).toBe('cima')
  })
})

describe('teclas de ação', () => {
  it('E interage', () => {
    expect(acaoDeTecla('KeyE')).toBe('interagir')
  })

  it('Esc fecha', () => {
    expect(acaoDeTecla('Escape')).toBe('fechar')
  })

  it('Enter e Espaço confirmam', () => {
    expect(acaoDeTecla('Enter')).toBe('confirmar')
    expect(acaoDeTecla('Space')).toBe('confirmar')
  })

  it('tecla que não é do jogo não vira ação', () => {
    expect(acaoDeTecla('KeyQ')).toBeNull()
    expect(acaoDeTecla('F5')).toBeNull()
  })
})
