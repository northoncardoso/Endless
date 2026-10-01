import { describe, expect, it } from 'vitest'
import { calcularTicks } from '../relogio'

const TICKS = 6

describe('relógio de ticks', () => {
  it('não roda tick nenhum antes de completar o tempo', () => {
    const resultado = calcularTicks(0, 1 / TICKS / 2, TICKS)

    expect(resultado.ticks).toBe(0)
    expect(resultado.acumulado).toBeCloseTo(1 / TICKS / 2)
  })

  it('roda um tick quando completa o tempo', () => {
    const resultado = calcularTicks(0, 1 / TICKS, TICKS)

    expect(resultado.ticks).toBe(1)
  })

  it('guarda o resto, para o goblin não perder tempo entre quadros', () => {
    // 60 fps com 6 ticks por segundo não fecha exatamente: sobra um resto a cada
    // quadro. Sem guardar, o vagar fica mais lento em tela de 60 hz.
    let acumulado = 0
    let total = 0
    for (let quadro = 0; quadro < 60; quadro += 1) {
      const resultado = calcularTicks(acumulado, 1 / 60, TICKS)
      acumulado = resultado.acumulado
      total += resultado.ticks
    }

    expect(total).toBe(6)
    expect(acumulado).toBeCloseTo(0)
  })

  it('em tela rápida o mesmo segundo dá o mesmo número de ticks', () => {
    let acumulado = 0
    let total = 0
    for (let quadro = 0; quadro < 240; quadro += 1) {
      const resultado = calcularTicks(acumulado, 1 / 240, TICKS)
      acumulado = resultado.acumulado
      total += resultado.ticks
    }

    expect(total).toBe(6)
  })

  it('quadro perdido de uma vez roda os ticks que faltavam, sem estourar', () => {
    const resultado = calcularTicks(0, 1, TICKS)

    expect(resultado.ticks).toBe(TICKS)
    expect(resultado.acumulado).toBeCloseTo(0)
  })

  it('tempo negativo não vira tick', () => {
    expect(calcularTicks(0, -1, TICKS).ticks).toBe(0)
  })

  it('taxa zero ou negativa não roda nada e não quebra', () => {
    expect(calcularTicks(0.5, 1, 0)).toEqual({ acumulado: 0.5, ticks: 0 })
    expect(calcularTicks(0, 1, -3).ticks).toBe(0)
  })
})
