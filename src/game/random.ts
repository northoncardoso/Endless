export type Sorteador = () => number

const FAIXA_SEMENTE = 0xffffffff

export function criarSorteador(semente: number): Sorteador {
  let estado = Math.trunc(semente) & FAIXA_SEMENTE

  return () => {
    estado = (estado + 0x6d2b79f5) | 0
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function sementeAleatoria(): number {
  return Math.floor(Math.random() * FAIXA_SEMENTE)
}

export function sortearInteiro(rng: Sorteador, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

export function sortear<T>(rng: Sorteador, itens: readonly T[]): T {
  const escolhido = itens[sortearInteiro(rng, 0, itens.length - 1)]
  if (escolhido === undefined) {
    throw new Error('sortear precisa de uma lista com pelo menos um item')
  }
  return escolhido
}