import { describe, expect, it } from 'vitest'
import {
  PASSOS_ANTES_PAUSA,
  RAIO_GATILHO_PIXELS,
  RAIO_VAGAR_TILES,
  TILES_APOS_FUGA,
  TAMANHO_TILE,
  centroDoTile,
  distancia,
  dentroDosLimites,
  ehSolido,
  emAlcanceDeBatalha,
  mover,
  moverComDeslize,
  passo,
  podeOcupar,
  reaparecerAposFuga,
  regenerarVidaExploracao,
  tileDe,
  vagarGoblin,
} from '../mapa'
import { criarSorteador } from '../random'
import type { Goblin, Mapa, Unidade } from '../tipos'

// Mapa 10 por 10, tudo livre, com uma parede em L no canto direito.
function mapaDeTeste(): Mapa {
  const largura = 10
  const altura = 10
  const solidos = new Array<boolean>(largura * altura).fill(false)

  for (const [x, y] of [
    [7, 3],
    [8, 3],
    [8, 4],
    [8, 5],
  ] as const) {
    solidos[y * largura + x] = true
  }

  return { largura, altura, solidos }
}

// Mapa pequeno, com uma parede no meio, para testar o escorregamento.
function mapaComUmaParede(...paredes: readonly [number, number][]): Mapa {
  const largura = 5
  const altura = 5
  const solidos = new Array<boolean>(largura * altura).fill(false)
  for (const [x, y] of paredes) {
    solidos[y * largura + x] = true
  }
  return { largura, altura, solidos }
}

function mapaGrande(): Mapa {
  const largura = 20
  const altura = 20
  return { largura, altura, solidos: new Array<boolean>(largura * altura).fill(false) }
}

function goblinDeTeste(sobrescrita: Partial<Goblin> = {}): Goblin {
  return {
    id: 'goblin-0',
    grupoId: 'grupo-a',
    pos: { x: 80, y: 80 },
    pontoFixo: { x: 80, y: 80 },
    direcao: 'baixo',
    pausaRestante: 0,
    ...sobrescrita,
  }
}

function unidadeDeTeste(vida: number): Unidade {
  return {
    id: 'heroi',
    nome: 'Herói',
    pos: { x: 0, y: 0 },
    vida,
    vidaMaxima: 100,
    mana: 0,
    manaMaxima: 0,
    velocidade: 10,
    ataqueFisico: 10,
    ataqueDistancia: 10,
    danoMagico: 10,
    tipoAtaque: 'fisico',
    defendendo: false,
    ehHeroi: true,
  }
}

describe('grade e tiles', () => {
  it('converte posição em tile e de volta', () => {
    expect(tileDe({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
    expect(tileDe({ x: 15, y: 15 })).toEqual({ x: 0, y: 0 })
    expect(tileDe({ x: 16, y: 32 })).toEqual({ x: 1, y: 2 })
    expect(centroDoTile({ x: 2, y: 3 })).toEqual({ x: 40, y: 56 })
  })

  it('lê a parede da grade', () => {
    const mapa = mapaDeTeste()

    expect(ehSolido(mapa, { x: 7, y: 3 })).toBe(true)
    expect(ehSolido(mapa, { x: 0, y: 0 })).toBe(false)
  })

  it('trata fora do mapa como sólido, para o personagem não escapar', () => {
    const mapa = mapaDeTeste()

    expect(ehSolido(mapa, { x: -1, y: 0 })).toBe(true)
    expect(ehSolido(mapa, { x: 0, y: 10 })).toBe(true)
    expect(dentroDosLimites(mapa, { x: 9, y: 9 })).toBe(true)
    expect(dentroDosLimites(mapa, { x: 10, y: 9 })).toBe(false)
  })

  it('a parede de L bloqueia o caminho inteiro', () => {
    const mapa = mapaDeTeste()

    expect(podeOcupar(mapa, { x: 7 * TAMANHO_TILE, y: 3 * TAMANHO_TILE })).toBe(false)
    expect(podeOcupar(mapa, { x: 8 * TAMANHO_TILE, y: 4 * TAMANHO_TILE })).toBe(false)
    expect(podeOcupar(mapa, { x: 6 * TAMANHO_TILE, y: 3 * TAMANHO_TILE })).toBe(true)
  })
})

describe('movimento', () => {
  it('cada direção move um tile', () => {
    expect(passo('cima')).toEqual({ x: 0, y: -1 })
    expect(passo('baixo')).toEqual({ x: 0, y: 1 })
    expect(passo('esquerda')).toEqual({ x: -1, y: 0 })
    expect(passo('direita')).toEqual({ x: 1, y: 0 })
  })

  it('não entra em parede', () => {
    const mapa = mapaDeTeste()
    const antesDaParede = { x: 6 * TAMANHO_TILE, y: 3 * TAMANHO_TILE }

    expect(mover(mapa, antesDaParede, 'direita')).toBeNull()
  })

  it('move para espaço livre', () => {
    const mapa = mapaDeTeste()

    expect(mover(mapa, { x: 32, y: 32 }, 'direita')).toEqual({ x: 48, y: 32 })
  })

  it('não sai do mapa', () => {
    const mapa = mapaDeTeste()

    expect(mover(mapa, { x: 0, y: 0 }, 'cima')).toBeNull()
    expect(mover(mapa, { x: 0, y: 0 }, 'esquerda')).toBeNull()
  })

  it('dá um passo na direção do destino', () => {
    const mapa = mapaDeTeste()

    expect(moverComDeslize(mapa, { x: 32, y: 32 }, { x: 96, y: 32 })).toEqual({ x: 48, y: 32 })
  })

  it('um passo por chamada, para não atravessar parede', () => {
    const mapa = mapaDeTeste()
    const de = { x: 6 * TAMANHO_TILE, y: 3 * TAMANHO_TILE }
    const destino = { x: 9 * TAMANHO_TILE, y: 3 * TAMANHO_TILE }

    const primeiro = moverComDeslize(mapa, de, destino)

    expect(primeiro).toEqual(de)
  })

  it('escorrega na parede em vez de travar', () => {
    const mapa = mapaComUmaParede([2, 2])
    const de = { x: 2 * TAMANHO_TILE, y: 1 * TAMANHO_TILE }
    const destino = { x: 3 * TAMANHO_TILE, y: 3 * TAMANHO_TILE }

    // Para baixo é a parede, então escorrega para o lado.
    expect(moverComDeslize(mapa, de, destino)).toEqual({
      x: 3 * TAMANHO_TILE,
      y: 1 * TAMANHO_TILE,
    })
  })

  it('com os dois lados bloqueados, fica onde está', () => {
    const mapa = mapaComUmaParede([2, 1], [1, 2])
    const de = { x: 1 * TAMANHO_TILE, y: 1 * TAMANHO_TILE }
    const destino = { x: 2 * TAMANHO_TILE, y: 2 * TAMANHO_TILE }

    expect(moverComDeslize(mapa, de, destino)).toEqual(de)
  })

  it('quando já chegou, não anda mais', () => {
    const de = { x: 48, y: 48 }

    expect(moverComDeslize(mapaDeTeste(), de, de)).toEqual(de)
  })
})

describe('vagar dos goblins', () => {
  it('anda em volta do ponto fixo sem sair do raio', () => {
    const mapa = mapaDeTeste()
    const pontoFixo = { x: 40, y: 40 }
    const goblin = goblinDeTeste({ pos: pontoFixo, pontoFixo })
    const raio = RAIO_VAGAR_TILES * TAMANHO_TILE
    let atual = goblin

    expect(distancia(atual.pos, atual.pontoFixo)).toBe(0)

    for (let i = 0; i < 500; i += 1) {
      atual = vagarGoblin(atual, mapa, criarSorteador(i))
      expect(distancia(atual.pos, atual.pontoFixo)).toBeLessThanOrEqual(raio)
    }
  })

  it('nunca entra em parede', () => {
    const mapa = mapaDeTeste()
    const goblin = goblinDeTeste({ pontoFixo: { x: 104, y: 56 } })
    let atual = goblin

    for (let i = 0; i < 500; i += 1) {
      atual = vagarGoblin(atual, mapa, criarSorteador(i))
      expect(podeOcupar(mapa, atual.pos)).toBe(true)
    }
  })

  it('pausa entre um passo e outro', () => {
    const mapa = mapaDeTeste()
    const parado = goblinDeTeste({ pausaRestante: 1 })

    const resultado = vagarGoblin(parado, mapa, criarSorteador(1))

    expect(resultado.pos).toEqual(parado.pos)
    expect(resultado.pausaRestante).toBe(0)
  })

  it('gasta a pausa inteira antes de andar de novo', () => {
    const mapa = mapaDeTeste()
    const parado = goblinDeTeste({ pausaRestante: PASSOS_ANTES_PAUSA })
    let atual = parado

    for (let i = 0; i < PASSOS_ANTES_PAUSA; i += 1) {
      atual = vagarGoblin(atual, mapa, criarSorteador(i))
    }

    expect(atual.pos).toEqual(parado.pos)
    expect(atual.pausaRestante).toBe(0)
  })

  it('depois de andar, pausa de novo', () => {
    const mapa = mapaDeTeste()
    const andando = vagarGoblin(goblinDeTeste(), mapa, () => 0.5)

    expect(andando.pausaRestante).toBe(PASSOS_ANTES_PAUSA)
  })

  it('a mesma semente dá o mesmo vagar', () => {
    const mapa = mapaDeTeste()
    let a = goblinDeTeste()
    let b = goblinDeTeste()

    for (let i = 0; i < 20; i += 1) {
      a = vagarGoblin(a, mapa, criarSorteador(i))
      b = vagarGoblin(b, mapa, criarSorteador(i))
    }

    expect(a.pos).toEqual(b.pos)
  })
})

describe('gatilho de batalha', () => {
  it('acerta dentro do raio de 24 pixels', () => {
    expect(emAlcanceDeBatalha({ x: 0, y: 0 }, { x: 0, y: RAIO_GATILHO_PIXELS })).toBe(true)
    expect(emAlcanceDeBatalha({ x: 0, y: 0 }, { x: 24, y: 0 })).toBe(true)
  })

  it('erra fora do raio', () => {
    expect(emAlcanceDeBatalha({ x: 0, y: 0 }, { x: 25, y: 0 })).toBe(false)
    expect(emAlcanceDeBatalha({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(false)
  })

  it('mede em pixels, não em tiles', () => {
    expect(RAIO_GATILHO_PIXELS).toBeLessThan(2 * TAMANHO_TILE)
  })
})

describe('reaparecer depois da fuga', () => {
  it('coloca o herói a 6 tiles do goblin, no meio do mapa', () => {
    const mapa = mapaGrande()
    const goblin = goblinDeTeste({ pos: { x: 10 * TAMANHO_TILE, y: 10 * TAMANHO_TILE } })
    const ponto = reaparecerAposFuga(goblin, mapa)

    expect(distancia(ponto, goblin.pos)).toBe(TILES_APOS_FUGA * TAMANHO_TILE)
    expect(emAlcanceDeBatalha(ponto, goblin.pos)).toBe(false)
  })

  it('perto da borda, recua até achar ponto livre', () => {
    const mapa = mapaDeTeste()
    const goblin = goblinDeTeste({ pos: { x: 0, y: 0 } })
    const ponto = reaparecerAposFuga(goblin, mapa)

    expect(podeOcupar(mapa, ponto)).toBe(true)
    expect(distancia(ponto, goblin.pos)).toBeLessThanOrEqual(TILES_APOS_FUGA * TAMANHO_TILE)
    expect(emAlcanceDeBatalha(ponto, goblin.pos)).toBe(false)
  })

  it('cai num ponto livre, não dentro da parede', () => {
    const mapa = mapaDeTeste()
    const goblin = goblinDeTeste({ pos: { x: 7 * TAMANHO_TILE, y: 3 * TAMANHO_TILE } })
    const ponto = reaparecerAposFuga(goblin, mapa)

    expect(podeOcupar(mapa, ponto)).toBe(true)
  })
})

describe('regeneração na exploração', () => {
  it('cura 1 por segundo, sem passar da vida máxima', () => {
    expect(regenerarVidaExploracao(unidadeDeTeste(50), 10).vida).toBe(60)
    expect(regenerarVidaExploracao(unidadeDeTeste(95), 10).vida).toBe(100)
  })

  it('não muda nada além da vida', () => {
    const unidade = unidadeDeTeste(50)
    const depois = regenerarVidaExploracao(unidade, 3)

    expect(depois.vidaMaxima).toBe(unidade.vidaMaxima)
    expect(depois.mana).toBe(unidade.mana)
    expect(depois.pos).toEqual(unidade.pos)
  })
})