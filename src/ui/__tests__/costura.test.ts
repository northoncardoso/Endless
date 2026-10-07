import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// A montagem da cena e o laço do jogo moram em Mundo.tsx, e nenhum teste de
// regra da pasta src/game/ enxerga a pasta src/ui, porque ela precisa de DOM e
// de WebGL. Quando o merge do PR 28 apagou o efeito que chamava `criarCena`, o
// typecheck pegou os imports que sobraram, mas se o efeito e o import sumirem
// juntos nada acusa: o jogo abre sem canvas, sem movimento e sem tempo.
//
// Este teste é a costura. Ele procura no fonte os pontos que ligam a tela à
// regra, para que arrancar um deles seja uma falha de teste e não um jogo mudo.
const mundo = readFileSync(new URL('../Mundo.tsx', import.meta.url), 'utf8')

describe('a costura entre a tela e o jogo', () => {
  it('monta a cena, chamando criarCena no palco', () => {
    expect(mundo).toContain('criarCena(')
    expect(mundo).toContain('cena.current =')
  })

  it('liga o laço ao estado, despachando moverFluido e passarTempo', () => {
    expect(mundo).toContain("{ tipo: 'moverFluido'")
    expect(mundo).toContain("{ tipo: 'passarTempo'")
  })

  it('passa o pulso para a cena a cada quadro', () => {
    expect(mundo).toMatch(/aoQuadro\(quadro\)/)
  })
})