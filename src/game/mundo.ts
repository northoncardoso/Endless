import { bonusDe, derivados } from './atributos'
import { CATALOGO_ITENS } from './itens'
import {
  distancia,
  emAlcanceDeBatalha,
  mover,
  moverFluido,
  vagarGoblin,
  TAMANHO_TILE,
  tileDe,
} from './mapa'
import type { Sorteador } from './random'
import type {
  AlvoInteracao,
  Direcao,
  Goblin,
  ItemDaBag,
  LoteChao,
  Mapa,
  Mundo,
  Npc,
  Personagem,
  Posicao,
  Vitais,
} from './tipos'

export const LARGURA_MAPA = 40
export const ALTURA_MAPA = 24
export const RAIO_INTERACAO = 24

export const POSICAO_HEROI_INICIAL: Readonly<Posicao> = { x: 3 * TAMANHO_TILE, y: 20 * TAMANHO_TILE }

// O mapa é uma estrada com um muro de pedra de cada lado, mais uma barricada no
// meio. É o suficiente para o jogador sentir a colisão e não se perder, e é
// pequeno o bastante para o goblin caber no raio de vagar.
export function criarMapa(): Mapa {
  const solidos = new Array<boolean>(LARGURA_MAPA * ALTURA_MAPA).fill(false)

  for (let y = 0; y < ALTURA_MAPA; y += 1) {
    solidos[y * LARGURA_MAPA] = true
    solidos[y * LARGURA_MAPA + LARGURA_MAPA - 1] = true
  }
  for (let x = 0; x < LARGURA_MAPA; x += 1) {
    solidos[x] = true
    solidos[(ALTURA_MAPA - 1) * LARGURA_MAPA + x] = true
  }

  for (const [x, y] of [
    [12, 10],
    [12, 11],
    [12, 12],
    [13, 11],
  ] as const) {
    solidos[y * LARGURA_MAPA + x] = true
  }

  return { largura: LARGURA_MAPA, altura: ALTURA_MAPA, solidos }
}

export const GRUPOS_GOBLIN: readonly {
  grupoId: string
  pontos: readonly Posicao[]
}[] = [
  {
    grupoId: 'grupo-fronteira',
    pontos: [
      { x: 9 * TAMANHO_TILE, y: 16 * TAMANHO_TILE },
      { x: 10 * TAMANHO_TILE, y: 17 * TAMANHO_TILE },
    ],
  },
  {
    grupoId: 'grupo-cidade',
    pontos: [
      { x: 28 * TAMANHO_TILE, y: 7 * TAMANHO_TILE },
      { x: 29 * TAMANHO_TILE, y: 8 * TAMANHO_TILE },
    ],
  },
]

export function criarGoblin(id: string, grupoId: string, pontoFixo: Posicao): Goblin {
  return {
    id,
    grupoId,
    pos: pontoFixo,
    pontoFixo,
    direcao: 'baixo',
    pausaRestante: 0,
  }
}

export function criarNpcs(): Npc[] {
  return [
    {
      id: 'elfa-caravana',
      nome: 'Elfa da caravana',
      pos: { x: 5 * TAMANHO_TILE, y: 19 * TAMANHO_TILE },
      rota: 'caravana',
      vendeItem: false,
    },
    {
      id: 'rainha-kassandra',
      nome: 'Rainha Kassandra',
      pos: { x: 36 * TAMANHO_TILE, y: 3 * TAMANHO_TILE },
      rota: 'cidade',
      vendeItem: false,
    },
  ]
}

// Vida e mana iniciais do herói na exploração. Com o personagem já criado, os
// vitais saem dos derivados dos pontos e dos itens. Sem personagem, cai no
// corpo base: 50 de vida e 20 de mana, que é o que `derivados` dá com 0 ponto.
export function vitaisIniciais(personagem?: Readonly<Personagem> | null): Vitais {
  if (personagem === undefined || personagem === null) {
    const base = derivados({ forca: 0, agilidade: 0, inteligencia: 0 })
    return { vida: base.vidaMaxima, vidaMaxima: base.vidaMaxima, mana: base.manaMaxima, manaMaxima: base.manaMaxima }
  }
  const d = derivados(personagem.pontos, bonusDe(personagem.itensEquipados, CATALOGO_ITENS))
  return { vida: d.vidaMaxima, vidaMaxima: d.vidaMaxima, mana: d.manaMaxima, manaMaxima: d.manaMaxima }
}

export function criarMundo(personagem?: Readonly<Personagem> | null): Mundo {
  return {
    mapa: criarMapa(),
    heroi: { ...POSICAO_HEROI_INICIAL },
    direcaoHeroi: 'baixo',
    vitais: vitaisIniciais(personagem),
    goblins: GRUPOS_GOBLIN.flatMap((grupo) =>
      grupo.pontos.map((ponto, indice) =>
        criarGoblin(`${grupo.grupoId}-${indice}`, grupo.grupoId, ponto),
      ),
    ),
    npcs: criarNpcs(),
    loot: [],
  }
}

// Movimento do herói por tecla, em passos de um tile. É o que responde ao
// toque, e o movimento contínuo em `mapa.ts` responde à tecla segurada.
export function moverHeroi(
  mundo: Readonly<Mundo>,
  direcao: Direcao,
): Mundo {
  const destino = mover(mundo.mapa, mundo.heroi, direcao)
  if (destino === null) return mundo
  return { ...mundo, heroi: destino, direcaoHeroi: direcao }
}

export function moverHeroiFluido(
  mundo: Readonly<Mundo>,
  direcao: Direcao | null,
  dt: number,
  velocidadeMovimento: number,
): Mundo {
  const heroi = moverFluido(mundo.mapa, mundo.heroi, direcao, dt, velocidadeMovimento)
  if (heroi === mundo.heroi) return mundo
  return { ...mundo, heroi, direcaoHeroi: direcao ?? mundo.direcaoHeroi }
}

export function velocidadeDoHeroi(personagem: Readonly<Personagem>): number {
  return derivados(personagem.pontos, bonusDe(personagem.itensEquipados, CATALOGO_ITENS))
    .velocidadeMovimento
}

// O que a tecla E pega. NPC ganha de loot, porque falar com quem dá missão é
// mais importante que pegar um item. Dentro do mesmo tipo, o mais perto ganha.
export function alvoInteracao(mundo: Readonly<Mundo>): AlvoInteracao | null {
  const npc = mundo.npcs
    .filter((candidato) => distancia(candidato.pos, mundo.heroi) <= RAIO_INTERACAO)
    .sort((a, b) => distancia(a.pos, mundo.heroi) - distancia(b.pos, mundo.heroi))[0]

  if (npc !== undefined) return { tipo: 'npc', npc }

  const lote = mundo.loot
    .filter((candidato) => distancia(candidato.pos, mundo.heroi) <= RAIO_INTERACAO)
    .sort((a, b) => distancia(a.pos, mundo.heroi) - distancia(b.pos, mundo.heroi))[0]

  return lote === undefined ? null : { tipo: 'loot', lote }
}

export function pegarLote(mundo: Readonly<Mundo>, loteId: string): Mundo {
  const alvo = alvoInteracao(mundo)
  if (alvo === null || alvo.tipo !== 'loot' || alvo.lote.id !== loteId) return mundo
  return { ...mundo, loot: mundo.loot.filter((candidato) => candidato.id !== loteId) }
}

export function adicionarLoot(
  mundo: Readonly<Mundo>,
  id: string,
  pos: Readonly<Posicao>,
  item: ItemDaBag,
): Mundo {
  const lote: LoteChao = { id, pos: { ...pos }, item }
  return { ...mundo, loot: [...mundo.loot, lote] }
}

// O grupo de goblin mais próximo dentro do gatilho, que é o que entra em
// batalha. Devolve o id do grupo e as posições, e null quando ninguém está perto.
export function grupoEmAlcance(
  mundo: Readonly<Mundo>,
): { grupoId: string; ids: string[]; posInimigos: Posicao[] } | null {
  const perto = mundo.goblins.filter(
    (goblin) => emAlcanceDeBatalha(mundo.heroi, goblin.pos),
  )
  if (perto.length === 0) return null

  const grupoId = perto[0]?.grupoId ?? ''
  const doGrupo = mundo.goblins.filter((goblin) => goblin.grupoId === grupoId)

  return {
    grupoId,
    ids: doGrupo.map((goblin) => goblin.id),
    posInimigos: doGrupo.map((goblin) => goblin.pos),
  }
}

// Depois de vencer ou fugir, o goblin é empurrado para longe do herói, para não
// haver reencontro automático assim que a batalha fecha.
export function dispersarGrupo(mundo: Readonly<Mundo>, ids: readonly string[]): Mundo {
  const afastado = mundo.goblins.map((goblin) => {
    if (!ids.includes(goblin.id)) return goblin

    // O sinal é do herói para o ponto fixo, não o contrário: empurrar na direção
    // do herói seria um reencontro imediato.
    const direcao = Math.sign(goblin.pontoFixo.x - mundo.heroi.x) || 1
    let destino = goblin.pos
    for (let anel = 6; anel >= 1; anel -= 1) {
      const candidato = {
        x: goblin.pontoFixo.x + direcao * anel * TAMANHO_TILE,
        y: goblin.pontoFixo.y,
      }
      if (!ehSolidoNoMundo(mundo.mapa, tileDe(candidato))) {
        destino = candidato
        break
      }
    }

    return { ...goblin, pos: destino, pausaRestante: 0 }
  })

  return { ...mundo, goblins: afastado }
}

// Quem está em batalha não vagueia até a batalha acabar, senão o inimigo anda
// entre um turno e outro e o jogador mira num lugar que já não tem ninguém.
export function vagarGoblins(
  mundo: Readonly<Mundo>,
  rng: Sorteador,
  idsParados: readonly string[] = [],
): Mundo {
  if (idsParados.length === mundo.goblins.length) return mundo

  return {
    ...mundo,
    goblins: mundo.goblins.map((goblin) =>
      idsParados.includes(goblin.id) ? goblin : vagarGoblin(goblin, mundo.mapa, rng),
    ),
  }
}

function ehSolidoNoMundo(mapa: Readonly<Mapa>, tile: Readonly<Posicao>): boolean {
  if (tile.x < 0 || tile.y < 0 || tile.x >= mapa.largura || tile.y >= mapa.altura) {
    return true
  }
  return mapa.solidos[tile.y * mapa.largura + tile.x] ?? false
}

export function pontosDeInicio(grupoId: string): Posicao[] {
  const grupo = GRUPOS_GOBLIN.find((candidato) => candidato.grupoId === grupoId)
  return grupo === undefined ? [] : grupo.pontos.map((ponto) => ({ ...ponto }))
}