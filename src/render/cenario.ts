import { Container, Graphics } from 'pixi.js'
import { TAMANHO_TILE } from '../game/mapa'
import type { Mapa, Posicao } from '../game/tipos'
import { PALETA } from './paleta'

// O mapa do jogo é só uma grade de sólido e não sólido. O desenho decide o que
// cada sólido parece: o que está na borda é muro de pedra e o que está no meio
// é barricada de madeira. Isso é apresentação, então fica aqui e não vira regra.

export function criarCenario(mapa: Readonly<Mapa>): Container {
  const chao = new Graphics()
  const parede = new Graphics()

  for (let y = 0; y < mapa.altura; y += 1) {
    for (let x = 0; x < mapa.largura; x += 1) {
      const px = x * TAMANHO_TILE
      const py = y * TAMANHO_TILE

      // Xadrez suave no chão, para o jogador perceber que anda sobre tiles e
      // não sobre um retângulo liso.
      const alternado = (x + y) % 2 === 0
      chao.rect(px, py, TAMANHO_TILE, TAMANHO_TILE).fill(alternado ? PALETA.grama : PALETA.gramaEscura)
    }
  }

  for (let y = 0; y < mapa.altura; y += 1) {
    for (let x = 0; x < mapa.largura; x += 1) {
      if (!mapa.solidos[y * mapa.largura + x]) continue

      const px = x * TAMANHO_TILE
      const py = y * TAMANHO_TILE
      const madeira = ehBarricada(mapa, x, y)

      parede.rect(px, py, TAMANHO_TILE, TAMANHO_TILE).fill(madeira ? PALETA.madeira : PALETA.pedra)
      parede
        .rect(px, py, TAMANHO_TILE, 4)
        .fill(madeira ? PALETA.terra : PALETA.pedraTopo)
    }
  }

  const mundo = new Container()
  // O chão primeiro e a parede depois, para o herói ficar atrás do muro quando
  // encosta nele.
  mundo.addChild(chao, parede)
  return mundo
}

// Sólido que não está na borda é barricada. É a leitura que o mapa permite sem
// inventar um tipo de tile na regra.
function ehBarricada(mapa: Readonly<Mapa>, x: number, y: number): boolean {
  const naBorda =
    x === 0 || y === 0 || x === mapa.largura - 1 || y === mapa.altura - 1
  return !naBorda
}

export function pontoNoMundo(pos: Readonly<Posicao>): { x: number; y: number } {
  return { x: pos.x, y: pos.y }
}
