import { Container, Graphics } from 'pixi.js'
import { centroDoTile, TAMANHO_TILE } from '../game/mapa'
import type { Direcao, Mundo, Posicao } from '../game/tipos'
import { ALTURA_CABECA, ALTURA_CORPO, PALETA, TAMANHO_ATOR } from './paleta'

// Tudo que se mexe fica aqui. Cada ator é um `Container` com `Graphics` dentro,
// e o desenho é redesenhado só quando muda, para não alocar `Graphics` a 60
// quadros por segundo.

interface Ator {
  no: Container
  ultimoX: number
  ultimoY: number
  ultimaDirecao: Direcao | null
}

export interface CamadaAtores {
  no: Container
  atualizar(mundo: Readonly<Mundo>): void
  destruir(): void
}

export function criarAtores(): CamadaAtores {
  const loot = new Container()
  const goblins = new Container()
  const npcs = new Container()
  const heroi = new Container()

  const no = new Container()
  // A ordem importa: quem está mais embaixo na tela passa na frente.
  no.addChild(loot, goblins, npcs, heroi)

  const atores = new Map<string, Ator>()
  const emJogo = new Set<string>()

  function ator(id: string, camada: Container, desenhar: (g: Graphics) => void): Ator {
    const existente = atores.get(id)
    if (existente !== undefined) return existente

    const grafico = new Graphics()
    desenhar(grafico)
    const container = new Container()
    container.addChild(grafico)

    const criado: Ator = { no: container, ultimoX: Number.NaN, ultimoY: Number.NaN, ultimaDirecao: null }
    atores.set(id, criado)
    camada.addChild(container)
    return criado
  }

  function posicionar(alvo: Ator, pos: Readonly<Posicao>, direcao: Direcao | null, desenhar: (g: Graphics) => void): void {
    const x = pos.x - TAMANHO_ATOR / 2
    const y = pos.y - TAMANHO_ATOR
    const mudouPosicao = x !== alvo.ultimoX || y !== alvo.ultimoY
    const mudouDirecao = direcao !== null && direcao !== alvo.ultimaDirecao

    if (mudouPosicao || mudouDirecao) {
      alvo.no.x = x
      alvo.no.y = y
      alvo.ultimoX = x
      alvo.ultimoY = y
      alvo.ultimaDirecao = direcao ?? alvo.ultimaDirecao

      // O desenho interno só é refeito quando a direção muda, porque o
      // personagem é a única coisa com frente e costas.
      if (mudouDirecao) {
        const grafico = alvo.no.children[0]
        if (grafico instanceof Graphics) {
          grafico.clear()
          desenhar(grafico)
        }
      }
    }
  }

  return {
    no,
    atualizar(mundo: Readonly<Mundo>) {
      emJogo.clear()

      for (const lote of mundo.loot) {
        emJogo.add(`loot:${lote.id}`)
        const alvo = ator(`loot:${lote.id}`, loot, desenharLoot)
        posicionar(alvo, centroDoTile(tileDe(lote.pos)), null, desenharLoot)
      }

      for (const goblin of mundo.goblins) {
        emJogo.add(`goblin:${goblin.id}`)
        const alvo = ator(`goblin:${goblin.id}`, goblins, (g) => desenharGoblin(g, goblin.direcao))
        posicionar(alvo, goblin.pos, goblin.direcao, (g) => desenharGoblin(g, goblin.direcao))
      }

      for (const npc of mundo.npcs) {
        emJogo.add(`npc:${npc.id}`)
        const alvo = ator(`npc:${npc.id}`, npcs, (g) => desenharNpc(g))
        posicionar(alvo, npc.pos, null, (g) => desenharNpc(g))
      }

      const alvoHeroi = ator('heroi', heroi, (g) => desenharHeroi(g, mundo.direcaoHeroi))
      posicionar(alvoHeroi, mundo.heroi, mundo.direcaoHeroi, (g) => desenharHeroi(g, mundo.direcaoHeroi))
      emJogo.add('heroi')

      // Ator que saiu do mundo some do palco. Sem isso, o goblin que morreu ou o
      // loot que foi pego continuariam desenhados.
      for (const [id, alvo] of atores) {
        if (emJogo.has(id)) continue
        alvo.no.removeFromParent()
        alvo.no.destroy({ children: true })
        atores.delete(id)
      }
    },
    destruir() {
      no.destroy({ children: true })
      atores.clear()
    },
  }
}

function tileDe(pos: Readonly<Posicao>): Posicao {
  return { x: Math.floor(pos.x / TAMANHO_TILE), y: Math.floor(pos.y / TAMANHO_TILE) }
}

function desenharHeroi(g: Graphics, direcao: Direcao): void {
  const largura = 8
  g.rect((TAMANHO_ATOR - largura) / 2, ALTURA_CABECA, largura, ALTURA_CORPO).fill(PALETA.heroi)
  g.rect((TAMANHO_ATOR - largura) / 2, 0, largura, ALTURA_CABECA).fill(PALETA.heroiPele)

  const olhar = direcao === 'esquerda' ? -2 : direcao === 'direita' ? 2 : 0
  g.rect(4 + olhar, 1, 2, 1).fill(PALETA.heroiOlhos)
  g.rect(10 + olhar, 1, 2, 1).fill(PALETA.heroiOlhos)
}

function desenharGoblin(g: Graphics, direcao: Direcao): void {
  const largura = 8
  g.rect((TAMANHO_ATOR - largura) / 2, ALTURA_CABECA, largura, ALTURA_CORPO).fill(PALETA.goblin)
  g.rect((TAMANHO_ATOR - largura) / 2, 0, largura, ALTURA_CABECA).fill(PALETA.goblin)

  const olhar = direcao === 'esquerda' ? -2 : direcao === 'direita' ? 2 : 0
  g.rect(3 + olhar, 1, 3, 2).fill(PALETA.goblinOculos)
  g.rect(9 + olhar, 1, 3, 2).fill(PALETA.goblinOculos)
}

function desenharNpc(g: Graphics): void {
  const largura = 8
  g.rect((TAMANHO_ATOR - largura) / 2, ALTURA_CABECA, largura, ALTURA_CORPO).fill(PALETA.npc)
  g.rect((TAMANHO_ATOR - largura) / 2, 0, largura, ALTURA_CABECA).fill(PALETA.heroiPele)
  g.rect(4, 1, 2, 1).fill(PALETA.heroiOlhos)
  g.rect(10, 1, 2, 1).fill(PALETA.heroiOlhos)
}

function desenharLoot(g: Graphics): void {
  // Saco com brilho em cima, para o jogador achar o drop no meio da grama. Com a
  // arte do LPC entra o ícone do item aqui, e não texto, que ficaria ilegível em
  // tile de 16 pixels.
  g.roundRect(TAMANHO_ATOR / 2 - 3, TAMANHO_ATOR - 7, 6, 5, 1).fill(PALETA.loot)
  g.rect(TAMANHO_ATOR / 2 - 1, TAMANHO_ATOR - 10, 2, 3).fill(PALETA.lootBrilho)
}
