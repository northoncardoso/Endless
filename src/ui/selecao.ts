import type { Direcao } from '../game/tipos'

// O cursor das listas da tela de batalha. Andar uma lista de três ou quatro
// entradas é apresentação, então isso fica em `ui` e não vira regra do jogo: a
// regra de trocar alvo é `proximoAlvo`, em `combate.ts`, porque o círculo no chão
// precisa obedecer à mesma ordem que a batalha.
export function moverCursor(tamanho: number, atual: number, direcao: Direcao): number {
  if (tamanho <= 0) return 0
  // Um cursor que sobrou de uma lista maior começa no começo da lista nova, em vez
  // de ficar apontando para uma entrada que não existe mais.
  const inicio = atual >= 0 && atual < tamanho ? atual : 0
  const passo = direcao === 'direita' || direcao === 'baixo' ? 1 : -1
  return (inicio + passo + tamanho) % tamanho
}