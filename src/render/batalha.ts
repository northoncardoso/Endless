import { Container, Graphics, Text } from 'pixi.js'
import { REDUCAO_DEFESA, jaAgiuNaVolta, unidadeAtual, usaMana } from '../game/combate'
import type { Classe, EstadoBatalha, Posicao, Unidade } from '../game/tipos'
import { criarMarcadorAlvo, type MarcadorAlvo } from './alvo'
import { ALTURA_CABECA, ALTURA_CORPO, PALETA, TAMANHO_ATOR } from './paleta'

// A batalha é uma tela lateral: o herói à esquerda, os inimigos à direita, e o
// chão é uma linha reta. A posição que a regra guarda é a do mapa, e a batalha
// não depende dela, então quem decide onde cada unidade aparece é o desenho.
//
// Toda constante daqui é proporção de tela ou tamanho de desenho, e fica neste
// arquivo porque nada mais usa. O jogo é pensado para desktop, como o resto da
// interface.

export const PROPORCAO_CHAO = 0.74
export const PROPORCAO_HEROI = 0.18
export const PROPORCAO_INIMIGO = 0.58
export const ESPACO_INIMIGO = 0.18
// O goblin de trás fica mais embaixo, que é o que dá profundidade de arena sem
// depender de sprite.
export const RECUO_INIMIGO = 10
export const ALTURA_LINHA = 11
export const LARGURA_BARRA_PAINEL = 40
export const TAMANHO_RETRATO = 14
export const ESPACO_FILA = 8
export const LARGURA_NOME_FILA = 54
export const MARGEM_FILA = 12

// Frequência e amplitude do pulso da borda da fila. A amplitude é pequena de
// propósito: o olho precisa ver quem está agindo, sem ficar preso nisso.
const VELOCIDADE_FILA = 1.2
const PULSO_FILA = 0.15

// Opacidade de quem já agiu na volta atual. Apagado o bastante para a fila contar
// a ordem, claro o bastante para o nome continuar legível.
const APAGADO = 0.45

export interface OpcoesArena {
  largura: number
  altura: number
  classeHeroi: Classe | null
  alvoSelecionado: string | null
}

export interface CamadaBatalha {
  no: Container
  atualizar(batalha: Readonly<EstadoBatalha>, opcoes: OpcoesArena): void
  animar(segundos: number): void
  destruir(): void
}

export function criarCamadaBatalha(): CamadaBatalha {
  const fundo = new Container()
  const palco = new Container()
  const fila = new Container()
  const marcador: MarcadorAlvo = criarMarcadorAlvo()

  const no = new Container()
  no.addChild(fundo, palco, fila, marcador.no)
  no.visible = false

  let bordaAtiva: Graphics | null = null
  let tempo = 0

  function limpar(camada: Container): void {
    for (const filho of camada.removeChildren()) filho.destroy({ children: true })
  }

  return {
    no,

    atualizar(batalha, opcoes) {
      no.visible = true

      limpar(fundo)
      desenharFundo(fundo, opcoes)

      const pontos = posicoesNaArena(batalha.unidades, opcoes.largura, opcoes.altura)

      limpar(palco)
      for (const unidade of batalha.unidades) {
        const pos = pontos.get(unidade.id)
        if (pos === undefined) continue
        palco.addChild(desenharUnidade(unidade, pos, mostraMana(unidade, opcoes.classeHeroi)))
      }

      limpar(fila)
      bordaAtiva = desenharFila(batalha, fila, opcoes.largura)

      const alvo = batalha.unidades.find((unidade) => unidade.id === opcoes.alvoSelecionado)
      const posAlvo = alvo === undefined ? undefined : pontos.get(alvo.id)
      marcador.mostrar(posAlvo ?? null)
    },

    animar(segundos) {
      if (!no.visible) return
      tempo += segundos
      // O tamanho da moldura não muda, para a fila não respirar e desalinhar o
      // nome de quem está agindo.
      if (bordaAtiva !== null) {
        bordaAtiva.alpha = 0.6 + (Math.sin(tempo * VELOCIDADE_FILA * Math.PI) + 1) * PULSO_FILA
      }
      marcador.animar(segundos)
    },

    destruir() {
      marcador.destruir()
      no.destroy({ children: true })
    },
  }
}

// Posições na arena. O herói fica à esquerda e os inimigos à direita, e o
// primeiro inimigo da ordem é o mais perto da beira. A posição guardada na
// unidade é a do mapa, e é ignorada aqui de propósito.
function posicoesNaArena(
  unidades: readonly Unidade[],
  largura: number,
  altura: number,
): Map<string, Posicao> {
  const chao = Math.round(altura * PROPORCAO_CHAO)
  const pontos = new Map<string, Posicao>()

  for (const unidade of unidades) {
    if (!unidade.ehHeroi) continue
    pontos.set(unidade.id, { x: Math.round(largura * PROPORCAO_HEROI), y: chao })
  }

  const inimigos = unidades.filter((unidade) => !unidade.ehHeroi)
  inimigos.forEach((unidade, indice) => {
    pontos.set(unidade.id, {
      x: Math.round(largura * (PROPORCAO_INIMIGO + indice * ESPACO_INIMIGO)),
      y: chao + (indice % 2 === 1 ? RECUO_INIMIGO : 0),
    })
  })

  return pontos
}

// O fundo é a imagem do LPC do local da batalha quando a arte existir, e é a
// única coisa que muda aqui. O desenho de agora é o mesmo tipo de placeholder do
// cenário do mundo: o jogo abre e ocupa a tela antes de a arte chegar.
function desenharFundo(camada: Container, opcoes: Readonly<OpcoesArena>): void {
  const { largura, altura } = opcoes
  const chao = Math.round(altura * PROPORCAO_CHAO)
  const g = new Graphics()

  g.rect(0, 0, largura, altura).fill(PALETA.batalhaCeu)
  g.rect(0, Math.round(altura / 2), largura, Math.round(altura / 2)).fill(PALETA.batalhaMorro)
  for (const [proporcao, alturaDaPedra] of [
    [0.08, 0.18],
    [0.21, 0.11],
    [0.33, 0.22],
  ] as const) {
    const larguraDaPedra = 7
    const y = chao - Math.round(altura * alturaDaPedra)
    g.rect(Math.round(largura * proporcao), y, larguraDaPedra, Math.round(altura * alturaDaPedra)).fill(
      PALETA.batalhaPedra,
    )
  }
  g.rect(0, chao, largura, altura - chao).fill(PALETA.batalhaTerra)
  g.rect(0, chao, largura, 2).fill(PALETA.batalhaChao)

  camada.addChild(g)
}

// A spec manda mostrar a mana só no mago. Quem sabe a classe é o estado do jogo
// e a regra de quem tem mana é `usaMana`, então a tela não repete a decisão.
function mostraMana(unidade: Readonly<Unidade>, classeHeroi: Classe | null): boolean {
  if (!unidade.ehHeroi) return unidade.manaMaxima > 0
  return classeHeroi !== null && usaMana(classeHeroi)
}

interface LinhaPainel {
  texto: string
  cor: number
  barra: 'vida' | 'mana' | null
}

function desenharUnidade(
  unidade: Readonly<Unidade>,
  pos: Readonly<Posicao>,
  temMana: boolean,
): Container {
  const no = new Container()
  const grafico = new Graphics()

  desenharSilhueta(grafico, unidade)

  const linhas: LinhaPainel[] = [
    { texto: unidade.nome, cor: PALETA.texto, barra: null },
    { texto: `${unidade.vida}/${unidade.vidaMaxima}`, cor: PALETA.batalhaVida, barra: 'vida' },
  ]
  if (temMana) {
    linhas.push({
      texto: `${unidade.mana}/${unidade.manaMaxima}`,
      cor: PALETA.batalhaMana,
      barra: 'mana',
    })
  }
  if (unidade.defendendo) {
    linhas.push({
      texto: `defende ${porcento(1 - REDUCAO_DEFESA)}%, esquiva ${porcento(unidade.esquiva)}%`,
      cor: PALETA.defesa,
      barra: null,
    })
  }

  const topo = pos.y - TAMANHO_ATOR
  const xBarra = pos.x - LARGURA_BARRA_PAINEL / 2

  for (const [indice, linha] of linhas.entries()) {
    const y = topo - ALTURA_LINHA * linhas.length + indice * ALTURA_LINHA

    if (linha.barra === null) {
      no.addChild(textoNo(linha.texto, pos.x, y, linha.cor, 'centro'))
      continue
    }

    no.addChild(textoNo(linha.texto, pos.x + LARGURA_BARRA_PAINEL / 2 + 3, y, linha.cor, 'esquerda'))
    const valor = linha.barra === 'vida' ? unidade.vida / unidade.vidaMaxima : unidade.mana / unidade.manaMaxima
    const preenchida = LARGURA_BARRA_PAINEL * Math.max(0, Math.min(1, valor))
    grafico.rect(xBarra, y + 4, LARGURA_BARRA_PAINEL, 4).fill(PALETA.batalhaBarra)
    grafico.rect(xBarra, y + 4, preenchida, 4).fill(linha.cor)
  }

  no.addChildAt(grafico, 0)
  no.x = pos.x - TAMANHO_ATOR / 2
  return no
}

// A arena mostra a unidade de lado e o mundo mostra de frente. São dois desenhos
// do mesmo ator, então ficam em arquivos diferentes.
function desenharSilhueta(g: Graphics, unidade: Readonly<Unidade>): void {
  const corpo = unidade.ehHeroi ? PALETA.heroi : PALETA.goblin
  const cabeca = unidade.ehHeroi ? PALETA.heroiPele : PALETA.goblin
  const largura = 7
  const x = (TAMANHO_ATOR - largura) / 2

  g.rect(x, ALTURA_CABECA, largura, ALTURA_CORPO).fill(corpo)
  g.rect(x, 0, largura, ALTURA_CABECA).fill(cabeca)
  // Um braço esticado na direção do adversário, que é o que dá a pose de combate
  // sem depender de sprite.
  const braco = unidade.ehHeroi ? x + largura : 0
  g.rect(braco, ALTURA_CABECA + 5, largura, 2).fill(corpo)
  g.rect(unidade.ehHeroi ? 5 : 9, 1, 2, 2).fill(PALETA.goblinOculos)
}

// Fila de turnos no topo. Quem está agindo fica com a borda acesa e um pulso
// leve, quem já agiu na volta atual fica apagado, e quem morreu some na hora.
function desenharFila(
  batalha: Readonly<EstadoBatalha>,
  camada: Container,
  largura: number,
): Graphics | null {
  const naFila = batalha.ordem
    .map((id) => batalha.unidades.find((unidade) => unidade.id === id))
    .filter((unidade): unidade is Unidade => unidade !== undefined && unidade.vida > 0)

  if (naFila.length === 0) return null

  const atual = unidadeAtual(batalha)?.id
  const larguraDaCelula = TAMANHO_RETRATO + 4 + LARGURA_NOME_FILA + ESPACO_FILA
  const inicio = Math.max(
    MARGEM_FILA,
    Math.round((largura - larguraDaCelula * naFila.length) / 2),
  )

  let bordaAtiva: Graphics | null = null

  for (const [indice, unidade] of naFila.entries()) {
    const celula = new Container()
    const g = new Graphics()
    const cor = unidade.ehHeroi ? PALETA.heroi : PALETA.goblin

    g.rect(0, 0, TAMANHO_RETRATO, TAMANHO_RETRATO).fill(cor)
    g.rect(0, TAMANHO_RETRATO - 4, TAMANHO_RETRATO, 4).fill(PALETA.batalhaBarra)
    g.rect(
      0,
      TAMANHO_RETRATO - 4,
      TAMANHO_RETRATO * Math.max(0, Math.min(1, unidade.vida / unidade.vidaMaxima)),
      4,
    ).fill(PALETA.batalhaVida)
    celula.addChild(g)

    celula.addChild(
      textoNo(unidade.nome, TAMANHO_RETRATO + 4, 3, PALETA.texto, 'esquerda'),
    )

    if (unidade.id === atual) {
      bordaAtiva = new Graphics()
      bordaAtiva
        .rect(-1, -1, TAMANHO_RETRATO + 2, TAMANHO_RETRATO + 2)
        .stroke({ color: PALETA.batalhaBorda, width: 1 })
      celula.addChild(bordaAtiva)
    } else if (jaAgiuNaVolta(batalha, unidade.id)) {
      celula.alpha = APAGADO
    }

    celula.x = inicio + indice * larguraDaCelula
    celula.y = MARGEM_FILA
    camada.addChild(celula)
  }

  return bordaAtiva
}

// O estado guarda a esquiva como fração e a defesa como constante, e a tela mostra
// os dois em número inteiro. Arredondar é apresentação: o estado continua exato.
function porcento(fracao: number): number {
  return Math.round(fracao * 100)
}

function textoNo(
  conteudo: string,
  x: number,
  y: number,
  cor: number,
  alinhamento: 'centro' | 'esquerda',
): Text {
  const texto = new Text({
    text: conteudo,
    style: { fill: cor, fontSize: 9, fontFamily: 'monospace' },
    resolution: 2,
  })
  texto.anchor.set(alinhamento === 'centro' ? 0.5 : 0, 0)
  texto.x = x
  texto.y = y
  return texto
}