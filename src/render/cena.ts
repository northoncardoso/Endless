import { Application, Container, Graphics } from 'pixi.js'
import type { EstadoJogo } from '../game/estado'
import { TAMANHO_TILE } from '../game/mapa'
import { criarMarcadorAlvo, type MarcadorAlvo } from './alvo'
import { criarAtores, type CamadaAtores } from './atores'
import { limitarAoMundo, seguirHeroi, tamanhoDoMundo, type Retangulo } from './camera'
import { criarCenario } from './cenario'
import { PALETA } from './paleta'

export const DURACAO_FADE = 0.3

export type Quadro = (segundos: number) => void

export interface Cena {
  canvas: HTMLCanvasElement
  // Desenha o estado atual. A cena não guarda regra nenhuma: ela lê o mundo e
  // põe no palco o que está lá.
  desenhar(estado: Readonly<EstadoJogo>, alvo: Readonly<{ x: number; y: number }> | null): void
  // O laço do jogo chama isto por quadro, com o tempo em segundos já dividido,
  // para o red e a cena concordarem sobre quanto tempo passou.
  aoQuadro(quadro: Quadro): void
  pausar(): void
  continuar(): void
  redimensionar(largura: number, altura: number): void
  entrar(): Promise<void>
  destruir(): void
}

export async function criarCena(alvo: HTMLElement): Promise<Cena> {
  const app = new Application()
  await app.init({
    antialias: false,
    background: PALETA.gramaEscura,
    resolution: Math.min(globalThis.devicePixelRatio || 1, 2),
    autoDensity: true,
    resizeTo: alvo,
    preference: 'webgl',
  })
  alvo.appendChild(app.canvas)

  const camera = new Container()
  const conteudo = new Container()
  camera.addChild(conteudo)
  app.stage.addChild(camera)

  const fade = new Graphics().rect(0, 0, app.screen.width, app.screen.height).fill(PALETA.fade)
  fade.eventMode = 'none'
  app.stage.addChild(fade)

  let cenario: Container | null = null
  let atores: CamadaAtores | null = null
  let marcador: MarcadorAlvo | null = null
  let centro: { x: number; y: number } = { x: 0, y: 0 }
  let tamanho: Retangulo = { largura: 0, altura: 0 }
  const quadros: Quadro[] = []
  let mundoAtual: EstadoJogo | null = null

  fade.alpha = 1

  function montar(mapa: NonNullable<EstadoJogo['mundo']>['mapa']): void {
    if (cenario !== null) return

    cenario = criarCenario(mapa)
    atores = criarAtores()
    marcador = criarMarcadorAlvo()
    conteudo.addChild(cenario, marcador.no, atores.no)
    tamanho = tamanhoDoMundo(mapa)
  }

  function centralizar(estado: Readonly<EstadoJogo>): void {
    centro = limitarAoMundo(estado.mundo.heroi, tamanho)
  }

  function ajustarCamera(estado: Readonly<EstadoJogo>): void {
    centro = seguirHeroi(centro, estado.mundo.heroi, { mundo: tamanho })
    camera.x = Math.round(app.screen.width / 2 - centro.x)
    camera.y = Math.round(app.screen.height / 2 - centro.y)
  }

  app.ticker.add((ticker) => {
    const segundos = ticker.deltaMS / 1000
    for (const quadro of quadros) quadro(segundos)

    if (mundoAtual === null || atores === null || marcador === null) return
    ajustarCamera(mundoAtual)
    atores.atualizar(mundoAtual.mundo)
    marcador.animar(segundos)
  })

  return {
    canvas: app.canvas,

    desenhar(estado, alvo) {
      if (estado.mundo === null) return
      montar(estado.mundo.mapa)
      if (cenario === null || atores === null || marcador === null) return

      mundoAtual = estado
      if (tamanho.largura === 0) centralizar(estado)

      atores.atualizar(estado.mundo)
      marcador.mostrar(alvo)
      ajustarCamera(estado)
    },

    aoQuadro(quadro) {
      quadros.push(quadro)
    },

    pausar() {
      app.ticker.stop()
    },

    continuar() {
      app.ticker.start()
    },

    redimensionar(largura, altura) {
      app.renderer.resize(largura, altura)
      fade.clear().rect(0, 0, largura, altura).fill(PALETA.fade)
    },

    async entrar() {
      // O fundo do mapa é uma imagem fixa e não há nada carregando, então o
      // fade é curto e serve só para amortecer a troca de tela.
      const passo = 1 / 60
      while (fade.alpha > 0) {
        fade.alpha = Math.max(0, fade.alpha - passo / DURACAO_FADE)
        await esperarQuadro()
      }
    },

    destruir() {
      quadros.length = 0
      atores?.destruir()
      marcador?.destruir()
      conteudo.destroy({ children: true })
      app.destroy(true, { children: true })
    },
  }
}

function esperarQuadro(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

export { TAMANHO_TILE }
