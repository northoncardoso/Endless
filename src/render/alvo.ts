import { Container, Graphics } from 'pixi.js'
import { TAMANHO_TILE } from '../game/mapa'
import type { Posicao } from '../game/tipos'
import { PALETA } from './paleta'

// O círculo no chão é o que transforma o alvo em algo visível. A regra já sabe
// qual é o alvo escolhido, então aqui só há desenho: se a posição for nula, o
// marcador some.
export interface MarcadorAlvo {
  no: Container
  mostrar(alvo: Readonly<Posicao> | null): void
  animar(segundos: number): void
  destruir(): void
}

export function criarMarcadorAlvo(): MarcadorAlvo {
  const circulo = new Graphics()
  const anel = new Graphics()

  circulo.ellipse(0, 0, TAMANHO_TILE * 0.62, TAMANHO_TILE * 0.3).fill(PALETA.alvo)
  anel.ellipse(0, 0, TAMANHO_TILE * 0.62, TAMANHO_TILE * 0.3).stroke({
    color: PALETA.heroi,
    width: 1,
  })

  const no = new Container()
  no.addChild(circulo, anel)
  no.visible = false

  let tempo = 0
  const VELOCIDADE = 1.6
  const PULSO = 0.08

  return {
    no,
    mostrar(alvo) {
      if (alvo === null) {
        no.visible = false
        return
      }
      no.visible = true
      no.x = alvo.x
      no.y = alvo.y + TAMANHO_TILE * 0.4
    },
    animar(segundos) {
      if (!no.visible) return
      // Pulso leve, sem mudar de tamanho, para o alvo continuar no lugar.
      tempo += segundos
      circulo.alpha = 0.45 + (Math.sin(tempo * VELOCIDADE * Math.PI) + 1) * PULSO
    },
    destruir() {
      no.destroy({ children: true })
    },
  }
}
