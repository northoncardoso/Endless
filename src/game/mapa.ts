import type { Sorteador } from './random'
import { sortear } from './random'
import type { Direcao, Goblin, Mapa, Posicao, Unidade } from './tipos'

export const TAMANHO_TILE = 16
export const RAIO_GATILHO_PIXELS = 24
export const RAIO_VAGAR_TILES = 3
export const TILES_APOS_FUGA = 6
export const PASSOS_ANTES_PAUSA = 2
export const REGENERACAO_VIDE_POR_SEGUNDO = 1

export const DIRECOES: readonly Direcao[] = [
  'cima',
  'baixo',
  'esquerda',
  'direita',
]

export function tileDe(pos: Readonly<Posicao>): Posicao {
  return { x: Math.floor(pos.x / TAMANHO_TILE), y: Math.floor(pos.y / TAMANHO_TILE) }
}

export function centroDoTile(tile: Readonly<Posicao>): Posicao {
  return {
    x: tile.x * TAMANHO_TILE + TAMANHO_TILE / 2,
    y: tile.y * TAMANHO_TILE + TAMANHO_TILE / 2,
  }
}

export function dentroDosLimites(mapa: Readonly<Mapa>, tile: Readonly<Posicao>): boolean {
  return tile.x >= 0 && tile.y >= 0 && tile.x < mapa.largura && tile.y < mapa.altura
}

export function ehSolido(mapa: Readonly<Mapa>, tile: Readonly<Posicao>): boolean {
  if (!dentroDosLimites(mapa, tile)) return true
  return mapa.solidos[tile.y * mapa.largura + tile.x] ?? false
}

export function podeOcupar(mapa: Readonly<Mapa>, pos: Readonly<Posicao>): boolean {
  return !ehSolido(mapa, tileDe(pos))
}

export function distancia(a: Readonly<Posicao>, b: Readonly<Posicao>): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function passo(direcao: Direcao): Posicao {
  switch (direcao) {
    case 'cima':
      return { x: 0, y: -1 }
    case 'baixo':
      return { x: 0, y: 1 }
    case 'esquerda':
      return { x: -1, y: 0 }
    case 'direita':
      return { x: 1, y: 0 }
  }
}

// `passo` devolve um tile, e as posições do jogo são em pixels, então a
// conversão acontece aqui. Sem isso o personagem anda 1 pixel por vez.
export function mover(
  mapa: Readonly<Mapa>,
  de: Readonly<Posicao>,
  direcao: Direcao,
): Posicao | null {
  const passoAtual = passo(direcao)
  const destino: Posicao = {
    x: de.x + passoAtual.x * TAMANHO_TILE,
    y: de.y + passoAtual.y * TAMANHO_TILE,
  }
  return podeOcupar(mapa, destino) ? destino : null
}

// Dá UM passo na direção do destino, e só um. Se o passo principal bate em
// parede, tenta o outro eixo, que é o escorregamento. Quem chama repete a
// chamada até chegar, então um passo por vez é o que impede atravessar parede.
export function moverComDeslize(
  mapa: Readonly<Mapa>,
  de: Readonly<Posicao>,
  destino: Readonly<Posicao>,
): Posicao {
  if (de.x === destino.x && de.y === destino.y) return de

  const dx = Math.sign(destino.x - de.x)
  const dy = Math.sign(destino.y - de.y)
  const primeiroHorizontal = Math.abs(destino.x - de.x) >= Math.abs(destino.y - de.y)

  const horizontais = primeiroHorizontal ? [dx, dy] : [dy, dx]
  const eixos = primeiroHorizontal ? ['x', 'y'] : ['y', 'x']

  for (let i = 0; i < horizontais.length; i += 1) {
    const passoEixo = horizontais[i] ?? 0
    if (passoEixo === 0) continue
    const candidato: Posicao =
      eixos[i] === 'x'
        ? { x: de.x + passoEixo * TAMANHO_TILE, y: de.y }
        : { x: de.x, y: de.y + passoEixo * TAMANHO_TILE }
    if (podeOcupar(mapa, candidato)) return candidato
  }

  return de
}

export function vagarGoblin(
  goblin: Readonly<Goblin>,
  mapa: Readonly<Mapa>,
  rng: Sorteador,
): Goblin {
  if (goblin.pausaRestante > 0) {
    return { ...goblin, pausaRestante: goblin.pausaRestante - 1 }
  }

  const direcao = sortear(rng, DIRECOES)
  const proxima = mover(mapa, goblin.pos, direcao)
  const raio = RAIO_VAGAR_TILES * TAMANHO_TILE

  if (proxima === null || distancia(proxima, goblin.pontoFixo) > raio) {
    return { ...goblin, direcao, pausaRestante: PASSOS_ANTES_PAUSA }
  }

  return {
    ...goblin,
    pos: proxima,
    direcao,
    pausaRestante: PASSOS_ANTES_PAUSA,
  }
}

export function emAlcanceDeBatalha(
  heroPos: Readonly<Posicao>,
  goblinPos: Readonly<Posicao>,
): boolean {
  return distancia(heroPos, goblinPos) <= RAIO_GATILHO_PIXELS
}

export function reaparecerAposFuga(
  goblin: Readonly<Goblin>,
  mapa: Readonly<Mapa>,
): Posicao {
  for (let anel = TILES_APOS_FUGA; anel >= 1; anel -= 1) {
    const distanciaAlvo = anel * TAMANHO_TILE
    for (const direcao of DIRECOES) {
      const passoAtual = passo(direcao)
      const candidato: Posicao = {
        x: goblin.pos.x + passoAtual.x * distanciaAlvo,
        y: goblin.pos.y + passoAtual.y * distanciaAlvo,
      }
      if (podeOcupar(mapa, candidato)) return candidato
    }
  }
  return goblin.pos
}

export function regenerarVidaExploracao(
  unidade: Readonly<Unidade>,
  segundos: number,
): Unidade {
  const curado = Math.min(unidade.vidaMaxima, unidade.vida + segundos * REGENERACAO_VIDE_POR_SEGUNDO)
  return { ...unidade, vida: curado }
}