import type {
  BonusEquipado,
  Derivados,
  Item,
  Personagem,
  PontosAtributo,
} from './tipos'

export const PONTOS_INICIAIS = 12

export const ZERO: Readonly<PontosAtributo> = Object.freeze({
  forca: 0,
  agilidade: 0,
  inteligencia: 0,
})

export function soma(
  pontos: Readonly<PontosAtributo>,
  bonus: Readonly<BonusEquipado>,
): PontosAtributo {
  return {
    forca: pontos.forca + (bonus.forca ?? 0),
    agilidade: pontos.agilidade + (bonus.agilidade ?? 0),
    inteligencia: pontos.inteligencia + (bonus.inteligencia ?? 0),
  }
}

// Fórmulas da spec, seção 5. Um item que dá atributo entra antes da fórmula, e
// por isso muda os derivados. Um item que dá vida ou mana soma depois.
export function derivados(
  pontos: Readonly<PontosAtributo>,
  bonus: Readonly<BonusEquipado> = {},
): Derivados {
  const f = pontos.forca + (bonus.forca ?? 0)
  const a = pontos.agilidade + (bonus.agilidade ?? 0)
  const i = pontos.inteligencia + (bonus.inteligencia ?? 0)

  return {
    vidaMaxima: 50 + f * 8 + (bonus.vida ?? 0),
    ataqueFisico: 5 + f * 2,
    ataqueDistancia: 4 + a * 2,
    danoMagico: 6 + i * 3,
    manaMaxima: 20 + i * 5 + (bonus.mana ?? 0),
    regeneracaoMana: i,
    velocidade: 10 + a,
  }
}

export function pontosUsados(pontos: Readonly<PontosAtributo>): number {
  return pontos.forca + pontos.agilidade + pontos.inteligencia
}

export function distribuicaoValida(
  pontos: Readonly<PontosAtributo>,
  disponiveis: number,
): boolean {
  const usados = pontosUsados(pontos)
  if (usados > disponiveis) return false
  return pontos.forca >= 0 && pontos.agilidade >= 0 && pontos.inteligencia >= 0
}

export function comPonto(
  pontos: Readonly<PontosAtributo>,
  atributo: keyof PontosAtributo,
): PontosAtributo {
  return { ...pontos, [atributo]: pontos[atributo] + 1 }
}

export function bonusDe(
  itensEquipados: readonly string[],
  catalogo: readonly Item[],
): BonusEquipado {
  const bonus: BonusEquipado = {}
  for (const id of itensEquipados) {
    const item = catalogo.find((candidato) => candidato.id === id)
    if (item === undefined) continue
    for (const [atributo, valor] of Object.entries(item.bonus)) {
      if (valor === undefined) continue
      const chave = atributo as keyof BonusEquipado
      bonus[chave] = (bonus[chave] ?? 0) + valor
    }
  }
  return bonus
}

export function derivadosDoPersonagem(
  personagem: Readonly<Personagem>,
  catalogo: readonly Item[],
): Derivados {
  return derivados(
    personagem.pontos,
    bonusDe(personagem.itensEquipados, catalogo),
  )
}