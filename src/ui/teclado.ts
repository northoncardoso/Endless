import type { Direcao } from '../game/tipos'

// A tecla vira intenção, nunca regra. O movimento é diferente das teclas de ação
// porque é contínuo: enquanto a tecla estiver pressionada o herói anda, e
// soltar a tecla é o que faz ele parar.
export type AcaoTecla = 'interagir' | 'fechar' | 'confirmar'

// `code` é o nome físico da tecla. `W` e `ArrowUp` precisam dar a mesma
// intenção, e o `code` não muda com o layout do teclado do jogador.
const DIRECOES: Readonly<Record<string, Direcao>> = {
  KeyA: 'esquerda',
  ArrowLeft: 'esquerda',
  KeyD: 'direita',
  ArrowRight: 'direita',
  KeyW: 'cima',
  ArrowUp: 'cima',
  KeyS: 'baixo',
  ArrowDown: 'baixo',
}

export function ehTeclaDeMovimento(code: string): boolean {
  return DIRECOES[code] !== undefined
}

// Só as setas, e sem as letras. Na batalha as setas trocam alvo e as letras não
// existem, então as duas telas não brigam pela tecla: só uma delas está montada,
// e a exploração some enquanto a batalha está na tela.
const SELECAO: Readonly<Record<string, Direcao>> = {
  ArrowLeft: 'esquerda',
  ArrowRight: 'direita',
  ArrowUp: 'cima',
  ArrowDown: 'baixo',
}

export function direcaoDeSelecao(code: string): Direcao | null {
  return SELECAO[code] ?? null
}

// Direção atual a partir das teclas pressionadas. `null` é ninguém pressionado,
// e é o que faz o herói parar. A ordem é fixa para que duas teclas opostas ao
// mesmo tempo não troquem de direção a cada quadro.
export function direcaoDasTeclas(teclas: ReadonlySet<string>): Direcao | null {
  for (const code of ['KeyA', 'ArrowLeft']) if (teclas.has(code)) return 'esquerda'
  for (const code of ['KeyW', 'ArrowUp']) if (teclas.has(code)) return 'cima'
  for (const code of ['KeyS', 'ArrowDown']) if (teclas.has(code)) return 'baixo'
  for (const code of ['KeyD', 'ArrowRight']) if (teclas.has(code)) return 'direita'
  return null
}

export function acaoDeTecla(code: string): AcaoTecla | null {
  if (code === 'KeyE') return 'interagir'
  if (code === 'Escape') return 'fechar'
  if (code === 'Enter' || code === 'Space') return 'confirmar'
  return null
}
