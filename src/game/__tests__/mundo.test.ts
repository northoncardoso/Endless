import { describe, expect, it } from 'vitest'
import { criarSorteador, type Sorteador } from '../random'
import { TAMANHO_TILE, RAIO_VAGAR_TILES, TICKS_VAGAR_POR_SEGUNDO } from '../mapa'
import {
  ALTURA_MAPA,
  GRUPOS_GOBLIN,
  LARGURA_MAPA,
  POSICAO_HEROI_INICIAL,
  RAIO_INTERACAO,
  alvoInteracao,
  criarGoblin,
  criarMapa,
  criarNpcs,
  dispersarGrupo,
  grupoEmAlcance,
  moverHeroi,
  moverHeroiFluido,
  pegarLote,
  pontosDeInicio,
  vagarGoblins,
  velocidadeDoHeroi,
} from '../mundo'
import type {
  Goblin,
  ItemDaBag,
  Mapa,
  Mundo,
  Personagem,
  PontosAtributo,
  Posicao,
} from '../tipos'

const ESPADA: ItemDaBag = { id: 'espada-de-ferro', nome: 'Espada de ferro', bonus: { forca: 3 } }
const PAO: ItemDaBag = { id: 'pao-de-viagem', nome: 'Pão de viagem', cura: 10 }

// O mapa de teste tem só a borda sólida, para o teste de colidir não depender
// da barricada do mapa de verdade.
function mapaAberto(): Mapa {
  const solidos = new Array<boolean>(LARGURA_MAPA * ALTURA_MAPA).fill(false)
  for (let y = 0; y < ALTURA_MAPA; y += 1) {
    solidos[y * LARGURA_MAPA] = true
    solidos[y * LARGURA_MAPA + LARGURA_MAPA - 1] = true
  }
  for (let x = 0; x < LARGURA_MAPA; x += 1) {
    solidos[x] = true
    solidos[(ALTURA_MAPA - 1) * LARGURA_MAPA + x] = true
  }
  return { largura: LARGURA_MAPA, altura: ALTURA_MAPA, solidos }
}

function mundoDeTeste(overrides: Partial<Mundo> = {}): Mundo {
  return {
    mapa: mapaAberto(),
    heroi: { x: 8 * TAMANHO_TILE, y: 8 * TAMANHO_TILE },
    direcaoHeroi: 'baixo',
    goblins: [],
    npcs: [],
    loot: [],
    ...overrides,
  }
}

function goblinDeTeste(pontoFixo: Posicao, id = 'grupo-a-0'): Goblin {
  return criarGoblin(id, id.replace(/-\d+$/, ''), pontoFixo)
}

const RAIO_VAGAR_PIXELS = RAIO_VAGAR_TILES * TAMANHO_TILE

describe('mapa', () => {
  it('tem muro nas quatro bordas, para o jogador não sair andando', () => {
    const mapa = criarMapa()

    expect(mapa.solidos[0]).toBe(true)
    expect(mapa.solidos[LARGURA_MAPA - 1]).toBe(true)
    expect(mapa.solidos[mapa.solidos.length - 1]).toBe(true)
  })

  it('coloca a barricada no meio da estrada', () => {
    const mapa = criarMapa()

    expect(mapa.solidos[10 * LARGURA_MAPA + 12]).toBe(true)
  })

  it('a posição inicial do herói não está dentro de parede', () => {
    const mapa = criarMapa()
    const tile = {
      x: Math.floor(POSICAO_HEROI_INICIAL.x / TAMANHO_TILE),
      y: Math.floor(POSICAO_HEROI_INICIAL.y / TAMANHO_TILE),
    }

    expect(mapa.solidos[tile.y * LARGURA_MAPA + tile.x]).toBe(false)
  })
})

describe('movimento do herói', () => {
  it('anda um tile por passo, e guarda a direção', () => {
    const mundo = mundoDeTeste({ heroi: { x: 100, y: 100 } })

    const movido = moverHeroi(mundo, 'direita')

    expect(movido.heroi).toEqual({ x: 100 + TAMANHO_TILE, y: 100 })
    expect(movido.direcaoHeroi).toBe('direita')
  })

  it('não entra na parede e devolve o mesmo mundo', () => {
    const mundo = mundoDeTeste({ heroi: { x: 0, y: 100 } })

    expect(moverHeroi(mundo, 'esquerda')).toBe(mundo)
  })

  it('anda na velocidade dos derivados quando o tempo passa', () => {
    const mundo = mundoDeTeste({ heroi: { x: 100, y: 100 } })

    // 2 tiles por segundo com derivado zerado, mais meio segundo, é um tile.
    const movido = moverHeroiFluido(mundo, 'direita', 0.5, 2)

    expect(movido.heroi.x).toBe(100 + TAMANHO_TILE)
    expect(movido.heroi.y).toBe(100)
  })

  it('não anda sem direção, que é o que acontece quando a tecla é solta', () => {
    const mundo = mundoDeTeste()

    expect(moverHeroiFluido(mundo, null, 0.5, 2)).toBe(mundo)
  })

  it('não anda com tempo zero, que acontece quando dois quadros caem no mesmo instante', () => {
    const mundo = mundoDeTeste()

    expect(moverHeroiFluido(mundo, 'direita', 0, 2)).toBe(mundo)
  })

  it('não atravessa a parede no movimento contínuo', () => {
    const mundo = mundoDeTeste({ heroi: { x: TAMANHO_TILE, y: 100 } })

    const movido = moverHeroiFluido(mundo, 'esquerda', 1, 6)

    expect(movido.heroi.x).toBeGreaterThanOrEqual(TAMANHO_TILE)
  })
})

describe('velocidade do herói', () => {
  function personagemDeTeste(pontos: PontosAtributo, itensEquipados: string[] = []): Personagem {
    return {
      nome: 'Herói',
      raca: 'humano',
      classe: 'arqueiro',
      pontos,
      itensEquipados,
      pontosLivres: 0,
    }
  }

  it('usa os derivados do personagem com o que está equipado', () => {
    const pontos: PontosAtributo = { forca: 0, agilidade: 6, inteligencia: 0 }

    // A espada dá força, e força não mexe em velocidade. O arco é que dá
    // agilidade, então é ele que muda o resultado.
    expect(velocidadeDoHeroi(personagemDeTeste(pontos, ['espada-de-ferro']))).toBe(
      velocidadeDoHeroi(personagemDeTeste(pontos)),
    )
    expect(velocidadeDoHeroi(personagemDeTeste(pontos, ['arco-de-caça']))).toBeGreaterThan(
      velocidadeDoHeroi(personagemDeTeste(pontos)),
    )
  })

  it('agilidade aumenta a velocidade de movimento', () => {
    const devagar = personagemDeTeste({ forca: 0, agilidade: 0, inteligencia: 0 })
    const rapido = personagemDeTeste({ forca: 0, agilidade: 6, inteligencia: 0 })

    expect(velocidadeDoHeroi(rapido)).toBeGreaterThan(velocidadeDoHeroi(devagar))
  })
})

describe('interação', () => {
  it('não devolve alvo quando não há nada por perto', () => {
    const mundo = mundoDeTeste({ npcs: criarNpcs() })

    expect(alvoInteracao(mundo)).toBeNull()
  })

  it('acha o NPC que está no raio', () => {
    const heroi = { x: 100, y: 100 }
    const mundo = mundoDeTeste({
      heroi,
      npcs: [
        {
          id: 'elfa-caravana',
          nome: 'Elfa da caravana',
          pos: { x: 100 + RAIO_INTERACAO, y: 100 },
          rota: 'caravana',
          vendeItem: false,
        },
      ],
    })

    expect(alvoInteracao(mundo)?.tipo).toBe('npc')
  })

  it('NPC ganha de loot, porque falar com quem dá missão é mais importante', () => {
    const heroi = { x: 100, y: 100 }
    const mundo = mundoDeTeste({
      heroi,
      npcs: [
        {
          id: 'elfa-caravana',
          nome: 'Elfa da caravana',
          pos: { x: 100 + RAIO_INTERACAO, y: 100 },
          rota: 'caravana',
          vendeItem: false,
        },
      ],
      loot: [{ id: 'g1', pos: { x: 100 - 4, y: 100 }, item: ESPADA }],
    })

    expect(alvoInteracao(mundo)?.tipo).toBe('npc')
  })

  it('dentro do loot, o mais perto ganha', () => {
    const heroi = { x: 100, y: 100 }
    const mundo = mundoDeTeste({
      heroi,
      loot: [
        { id: 'longe', pos: { x: 100 + 20, y: 100 }, item: ESPADA },
        { id: 'perto', pos: { x: 100 + 4, y: 100 }, item: PAO },
      ],
    })

    const alvo = alvoInteracao(mundo)
    expect(alvo?.tipo).toBe('loot')
    expect(alvo?.tipo === 'loot' ? alvo.lote.id : null).toBe('perto')
  })
})

describe('pegar loot', () => {
  it('tira o lote do chão', () => {
    const mundo = mundoDeTeste({
      heroi: { x: 100, y: 100 },
      loot: [{ id: 'perto', pos: { x: 104, y: 100 }, item: ESPADA }],
    })

    expect(pegarLote(mundo, 'perto').loot).toHaveLength(0)
  })

  it('não pega o lote que está longe', () => {
    const mundo = mundoDeTeste({
      heroi: { x: 100, y: 100 },
      loot: [{ id: 'longe', pos: { x: 100 + RAIO_INTERACAO + 10, y: 100 }, item: ESPADA }],
    })

    expect(pegarLote(mundo, 'longe')).toBe(mundo)
  })

  it('não pega NPC, porque NPC não é loot', () => {
    const mundo = mundoDeTeste({
      heroi: { x: 100, y: 100 },
      npcs: [
        {
          id: 'elfa-caravana',
          nome: 'Elfa da caravana',
          pos: { x: 104, y: 100 },
          rota: 'caravana',
          vendeItem: false,
        },
      ],
    })

    expect(pegarLote(mundo, 'elfa-caravana')).toBe(mundo)
  })
})

describe('gatilho de batalha', () => {
  it('não acha grupo quando o herói está longe', () => {
    const ponto = { x: 9 * TAMANHO_TILE, y: 16 * TAMANHO_TILE }
    const mundo = mundoDeTeste({
      heroi: { x: 3 * TAMANHO_TILE, y: 20 * TAMANHO_TILE },
      goblins: [goblinDeTeste(ponto)],
    })

    expect(grupoEmAlcance(mundo)).toBeNull()
  })

  it('acha o grupo inteiro quando o herói chega perto de um deles', () => {
    const pontos = pontosDeInicio('grupo-fronteira')
    const primeiro = pontos[0]
    if (primeiro === undefined) throw new Error('esperava pontos do grupo')
    const mundo = mundoDeTeste({
      heroi: { ...primeiro },
      goblins: pontos.map((ponto, indice) => goblinDeTeste(ponto, `grupo-fronteira-${indice}`)),
    })

    const grupo = grupoEmAlcance(mundo)
    expect(grupo?.grupoId).toBe('grupo-fronteira')
    expect(grupo?.ids).toHaveLength(2)
  })

  it('leva o herói junto quando o grupo entra na batalha', () => {
    const pontos = pontosDeInicio('grupo-fronteira')
    const primeiro = pontos[0]
    if (primeiro === undefined) throw new Error('esperava pontos do grupo')
    const mundo = mundoDeTeste({
      heroi: { ...primeiro },
      goblins: pontos.map((ponto, indice) => goblinDeTeste(ponto, `grupo-fronteira-${indice}`)),
    })

    const grupo = grupoEmAlcance(mundo)
    expect(grupo?.posInimigos).toEqual(pontos)
  })

  it('cada grupo do mapa tem dois goblins', () => {
    for (const grupo of GRUPOS_GOBLIN) {
      expect(pontosDeInicio(grupo.grupoId)).toHaveLength(2)
    }
  })
})

describe('dispersar grupo', () => {
  it('afasta o goblin do herói, para não haver reencontro na hora', () => {
    const ponto = { x: 9 * TAMANHO_TILE, y: 16 * TAMANHO_TILE }
    const heroi = { x: ponto.x - 10, y: ponto.y }
    const mundo = mundoDeTeste({ heroi, goblins: [goblinDeTeste(ponto)] })

    const depois = dispersarGrupo(mundo, ['grupo-a-0'])

    expect(Math.abs(depois.goblins[0]?.pos.x ?? 0)).toBeGreaterThan(
      Math.abs(mundo.goblins[0]?.pos.x ?? 0),
    )
  })

  it('não mexe em goblin de outro grupo', () => {
    const ponto = { x: 9 * TAMANHO_TILE, y: 16 * TAMANHO_TILE }
    const mundo = mundoDeTeste({
      heroi: { x: ponto.x - 10, y: ponto.y },
      goblins: [goblinDeTeste(ponto, 'outro-0')],
    })

    const depois = dispersarGrupo(mundo, ['grupo-a-0'])

    expect(depois.goblins[0]?.pos).toEqual(mundo.goblins[0]?.pos)
  })
})

describe('vagar dos goblins', () => {
  const rng: Sorteador = criarSorteador(7)

  it('mantém o goblin perto do ponto fixo', () => {
    const ponto = { x: 9 * TAMANHO_TILE, y: 16 * TAMANHO_TILE }
    let mundo = mundoDeTeste({ goblins: [goblinDeTeste(ponto)] })

    for (let i = 0; i < 40; i += 1) {
      mundo = vagarGoblins(mundo, rng)
    }

    const goblin = mundo.goblins[0]
    if (goblin === undefined) throw new Error('esperava goblin')
    expect(Math.abs(goblin.pos.x - ponto.x)).toBeLessThanOrEqual(RAIO_VAGAR_PIXELS)
    expect(Math.abs(goblin.pos.y - ponto.y)).toBeLessThanOrEqual(RAIO_VAGAR_PIXELS)
  })

  it('não mexe na posição do goblin que está parado', () => {
    const ponto = { x: 9 * TAMANHO_TILE, y: 16 * TAMANHO_TILE }
    const goblin = { ...goblinDeTeste(ponto), pausaRestante: 99 }
    const mundo = mundoDeTeste({ goblins: [goblin] })

    expect(vagarGoblins(mundo, rng).goblins[0]?.pos).toEqual(ponto)
  })

  it('não mexe no goblin que está em batalha', () => {
    const ponto = { x: 9 * TAMANHO_TILE, y: 16 * TAMANHO_TILE }
    const goblin = goblinDeTeste(ponto)
    const mundo = mundoDeTeste({ goblins: [goblin] })

    expect(vagarGoblins(mundo, rng, ['grupo-a-0']).goblins[0]).toBe(goblin)
  })

  it('o goblin entra em pausa depois de um passo, para não deslizar', () => {
    const ponto = { x: 9 * TAMANHO_TILE, y: 16 * TAMANHO_TILE }
    const mundo = mundoDeTeste({ goblins: [goblinDeTeste(ponto)] })

    expect(vagarGoblins(mundo, () => 0.99).goblins[0]?.pausaRestante).toBeGreaterThan(0)
  })

  it('cada tick anda no máximo um tile, então a taxa de ticks é o ritmo', () => {
    const ponto = { x: 9 * TAMANHO_TILE, y: 16 * TAMANHO_TILE }
    let mundo = mundoDeTeste({ goblins: [goblinDeTeste(ponto)] })

    // Um segundo de vagueio é TICKS_VAGAR_POR_SEGUNDO ticks, e nenhum tick
    // pode andar mais que um tile. Como o goblin pausa depois de cada passo, ele
    // anda bem menos que isso. É o contrato com quem desenha: o ritmo vem da
    // taxa de ticks, e não do tamanho do passo.
    for (let tick = 0; tick < TICKS_VAGAR_POR_SEGUNDO; tick += 1) {
      mundo = vagarGoblins(mundo, () => 0.1)
    }
    const pos = mundo.goblins[0]?.pos
    if (pos === undefined) throw new Error('esperava goblin')

    expect(Math.abs(pos.x - ponto.x) / TAMANHO_TILE).toBeLessThanOrEqual(TICKS_VAGAR_POR_SEGUNDO)
    expect(Math.abs(pos.y - ponto.y) / TAMANHO_TILE).toBeLessThanOrEqual(TICKS_VAGAR_POR_SEGUNDO)
  })
})