import { describe, expect, it } from 'vitest'
import { derivados, VELOCIDADE_BASE, ZERO } from '../atributos'
import {
  CUSTO_HABILIDADE,
  GOBLIN,
  PONTOS_POR_GOBLIN,
  acoesDisponiveis,
  aplicarAcao,
  calcularDano,
  criarBatalha,
  criarUnidadeHeroi,
  criarUnidadesGoblin,
  goblinsDerrotados,
  podeAgir,
  recompensaVitoria,
  unidadeAtual,
  unidadePorId,
} from '../combate'
import { criarSorteador } from '../random'
import type { EstadoBatalha, Posicao, Unidade } from '../tipos'

const INIMIGOS: readonly Posicao[] = [
  { x: 160, y: 96 },
  { x: 192, y: 96 },
]

const SEM_VARIACAO = () => 0.5

function unidadeDe(batalha: EstadoBatalha, id: string): Unidade {
  const unidade = unidadePorId(batalha, id)
  if (unidade === undefined) throw new Error(`unidade ${id} não está na batalha`)
  return unidade
}

function heroiDeTeste(classe: 'cavaleiro' | 'mago' | 'arqueiro' = 'cavaleiro'): Unidade {
  return criarUnidadeHeroi(
    'heroi',
    'Herói',
    classe,
    derivados({ forca: 6, agilidade: 2, inteligencia: 0 }),
    { x: 64, y: 96 },
  )
}

function batalhaDeTeste(): EstadoBatalha {
  return criarBatalha(heroiDeTeste(), criarUnidadesGoblin('grupo-a', 2, INIMIGOS))
}

function comVida(batalha: EstadoBatalha, id: string, vida: number): EstadoBatalha {
  return {
    ...batalha,
    unidades: batalha.unidades.map((unidade) =>
      unidade.id === id ? { ...unidade, vida } : unidade,
    ),
  }
}

describe('ordem de turnos', () => {
  it('sempre joga o herói primeiro, e os inimigos na ordem de entrada', () => {
    const batalha = batalhaDeTeste()
    const goblins = batalha.unidades.filter((unidade) => !unidade.ehHeroi)

    expect(batalha.ordem[0]).toBe('heroi')
    expect(batalha.ordem[1]).toBe(goblins[0]?.id)
    expect(batalha.ordem[2]).toBe(goblins[1]?.id)
  })

  it('não deixa a agilidade da unidade mudar a vez dela', () => {
    const heroi = heroiDeTeste()
    const rapidos = criarUnidadesGoblin('grupo-a', 2, INIMIGOS).map((goblin, indice) => ({
      ...goblin,
      esquiva: indice,
    }))

    expect(criarBatalha(heroi, rapidos).ordem).toEqual([
      'heroi',
      'grupo-a-0',
      'grupo-a-1',
    ])
  })

  it('completa um ciclo, com cada unidade agindo uma vez', () => {
    let batalha = batalhaDeTeste()
    const ordemEsperada = [...batalha.ordem]
    const agiram: string[] = []

    for (let i = 0; i < ordemEsperada.length; i += 1) {
      const unidade = unidadeAtual(batalha)
      if (unidade === undefined) throw new Error('esperava uma unidade viva')
      agiram.push(unidade.id)
      const resultado = aplicarAcao(batalha, { tipo: 'defender' }, criarSorteador(i))
      if (!resultado.ok) throw new Error(resultado.motivo)
      batalha = resultado.estado
    }

    expect(agiram).toEqual(ordemEsperada)
    expect(unidadeAtual(batalha)?.id).toBe(ordemEsperada[0])
  })

  it('pula unidade morta e não devolve a vez dela', () => {
    const inicial = batalhaDeTeste()
    const morto = inicial.ordem.find((id) => id !== 'heroi') ?? ''
    let batalha = comVida(inicial, morto, 0)
    const agiram: string[] = []

    for (let ciclo = 0; ciclo < 4; ciclo += 1) {
      const unidade = unidadeAtual(batalha)
      if (unidade === undefined) throw new Error('esperava uma unidade viva')
      agiram.push(unidade.id)
      const resultado = aplicarAcao(batalha, { tipo: 'defender' }, criarSorteador(ciclo))
      if (!resultado.ok) throw new Error(resultado.motivo)
      batalha = resultado.estado
    }

    expect(agiram).not.toContain(morto)
    expect(agiram).toEqual(['heroi', 'grupo-a-1', 'heroi', 'grupo-a-1'])
  })
})

describe('dano', () => {
  it('varia no máximo 20 por cento em cima da base', () => {
    const rng = criarSorteador(5)
    let minimo = Number.POSITIVE_INFINITY
    let maximo = Number.NEGATIVE_INFINITY

    for (let i = 0; i < 500; i += 1) {
      const dano = calcularDano(100, rng)
      minimo = Math.min(minimo, dano)
      maximo = Math.max(maximo, dano)
    }

    expect(minimo).toBeGreaterThanOrEqual(80)
    expect(maximo).toBeLessThanOrEqual(120)
  })

  it('no meio da faixa não há variação nenhuma', () => {
    expect(calcularDano(100, SEM_VARIACAO)).toBe(100)
  })

  it('nunca dá menos de 1, para a batalha não travar', () => {
    expect(calcularDano(1, () => 0)).toBe(1)
  })

  it('tira vida do alvo', () => {
    const batalha = batalhaDeTeste()
    const alvoId = 'grupo-a-0'
    const antes = unidadeDe(batalha, alvoId).vida

    const resultado = aplicarAcao(batalha, { tipo: 'atacar', alvoId }, SEM_VARIACAO)
    if (!resultado.ok) throw new Error(resultado.motivo)

    expect(unidadeDe(resultado.estado, alvoId).vida).toBe(antes - 17)
  })

  it('defender corta o dano pela metade naquele turno', () => {
    const batalha = batalhaDeTeste()
    const alvoId = 'grupo-a-0'
    const vidaAntes = unidadeDe(batalha, alvoId).vida

    const semDefesa = aplicarAcao(batalha, { tipo: 'atacar', alvoId }, SEM_VARIACAO)
    if (!semDefesa.ok) throw new Error(semDefesa.motivo)

    const defendendo: EstadoBatalha = {
      ...batalha,
      unidades: batalha.unidades.map((unidade) =>
        unidade.id === alvoId ? { ...unidade, defendendo: true } : unidade,
      ),
    }
    const comDefesa = aplicarAcao(defendendo, { tipo: 'atacar', alvoId }, SEM_VARIACAO)
    if (!comDefesa.ok) throw new Error(comDefesa.motivo)

    const danoSemDefesa = vidaAntes - unidadeDe(semDefesa.estado, alvoId).vida
    const danoComDefesa = vidaAntes - unidadeDe(comDefesa.estado, alvoId).vida

    expect(danoComDefesa).toBe(Math.max(1, Math.floor(danoSemDefesa / 2)))
  })

  it('limpa a defesa no começo do próximo turno da própria unidade', () => {
    const inicial = batalhaDeTeste()
    const goblins = inicial.ordem.filter((id) => id !== 'heroi')
    let batalha = inicial

    const defesa = aplicarAcao(batalha, { tipo: 'defender' }, criarSorteador(1))
    if (!defesa.ok) throw new Error(defesa.motivo)
    batalha = defesa.estado

    expect(unidadeDe(batalha, 'heroi').defendendo).toBe(true)

    for (let i = 0; i < goblins.length; i += 1) {
      const resultado = aplicarAcao(batalha, { tipo: 'defender' }, criarSorteador(1))
      if (!resultado.ok) throw new Error(resultado.motivo)
      batalha = resultado.estado
    }

    // Cada goblin já agiu uma vez, então é a vez do herói de novo, e a defesa
    // do turno anterior não vale mais.
    expect(unidadeAtual(batalha)?.id).toBe('heroi')
    expect(unidadeDe(batalha, 'heroi').defendendo).toBe(false)
  })
})

describe('habilidade e mana', () => {
  it('cobra mana e causa dano mágico', () => {
    const heroi = heroiDeTeste('mago')
    const batalha = criarBatalha(heroi, criarUnidadesGoblin('grupo-a', 2, INIMIGOS))
    const manaAntes = unidadeDe(batalha, 'heroi').mana

    const resultado = aplicarAcao(
      batalha,
      { tipo: 'habilidade', alvoId: 'grupo-a-0' },
      SEM_VARIACAO,
    )
    if (!resultado.ok) throw new Error(resultado.motivo)

    expect(unidadeDe(resultado.estado, 'heroi').mana).toBe(manaAntes - CUSTO_HABILIDADE)
    expect(unidadeDe(resultado.estado, 'grupo-a-0').vida).toBeLessThan(
      unidadeDe(batalha, 'grupo-a-0').vida,
    )
  })

  it('sem mana a habilidade fica indisponível', () => {
    const heroi = heroiDeTeste('mago')
    const semMana = { ...heroi, mana: CUSTO_HABILIDADE - 1 }
    const batalha = criarBatalha(semMana, criarUnidadesGoblin('grupo-a', 2, INIMIGOS))

    expect(podeAgir(batalha, semMana, { tipo: 'habilidade', alvoId: 'grupo-a-0' })).toBe(false)
    expect(acoesDisponiveis(batalha, semMana)).not.toContain('habilidade')
  })

  it('sem mana a tentativa é recusada e a batalha não muda', () => {
    const heroi = { ...heroiDeTeste('mago'), mana: 0 }
    const batalha = criarBatalha(heroi, criarUnidadesGoblin('grupo-a', 2, INIMIGOS))
    const vidaAntes = unidadeDe(batalha, 'grupo-a-0').vida

    const resultado = aplicarAcao(
      batalha,
      { tipo: 'habilidade', alvoId: 'grupo-a-0' },
      criarSorteador(1),
    )

    expect(resultado.ok).toBe(false)
    expect(unidadeDe(batalha, 'grupo-a-0').vida).toBe(vidaAntes)
  })

  it('a mana nunca fica negativa', () => {
    const heroi = { ...heroiDeTeste('mago'), mana: 3 }
    const batalha = criarBatalha(heroi, criarUnidadesGoblin('grupo-a', 2, INIMIGOS))

    const resultado = aplicarAcao(batalha, { tipo: 'atacar', alvoId: 'grupo-a-0' }, criarSorteador(1))
    if (!resultado.ok) throw new Error(resultado.motivo)

    expect(unidadeDe(resultado.estado, 'heroi').mana).toBeGreaterThanOrEqual(0)
  })
})

describe('alvo', () => {
  it('não permite atacar aliado', () => {
    const batalha = batalhaDeTeste()
    expect(
      podeAgir(batalha, unidadeDe(batalha, 'heroi'), { tipo: 'atacar', alvoId: 'heroi' }),
    ).toBe(false)
  })

  it('não permite atacar quem já morreu', () => {
    const batalha = comVida(batalhaDeTeste(), 'grupo-a-0', 0)

    expect(
      podeAgir(batalha, unidadeDe(batalha, 'heroi'), { tipo: 'atacar', alvoId: 'grupo-a-0' }),
    ).toBe(false)
  })

  it('não permite alvo inexistente', () => {
    const batalha = batalhaDeTeste()
    expect(
      podeAgir(batalha, unidadeDe(batalha, 'heroi'), { tipo: 'atacar', alvoId: 'fantasma' }),
    ).toBe(false)
  })

  it('o herói não foge depois de morrer', () => {
    const batalha = comVida(batalhaDeTeste(), 'heroi', 0)
    expect(
      podeAgir(batalha, unidadeDe(batalha, 'heroi'), { tipo: 'fugir' }),
    ).toBe(false)
  })
})

describe('vitória, derrota e fuga', () => {
  it('o herói sozinho vence os dois goblin em um número curto de turnos', () => {
    let batalha = batalhaDeTeste()
    let acoes = 0

    while (batalha.fase === 'ativa' && acoes < 20) {
      const unidade = unidadeAtual(batalha)
      if (unidade === undefined) break
      const alvo = batalha.unidades.find((outra) => outra.ehHeroi !== unidade.ehHeroi && outra.vida > 0)
      if (alvo === undefined) break
      const resultado = aplicarAcao(batalha, { tipo: 'atacar', alvoId: alvo.id }, SEM_VARIACAO)
      if (!resultado.ok) throw new Error(resultado.motivo)
      batalha = resultado.estado
      acoes += 1
    }

    expect(batalha.fase).toBe('vitoria')
    expect(acoes).toBeLessThan(12)
    expect(unidadeDe(batalha, 'heroi').vida).toBeGreaterThan(0)
  })

  it('vida do herói em zero dá derrota', () => {
    const inicial = comVida(batalhaDeTeste(), 'heroi', 1)
    let batalha = { ...inicial, indiceTurno: inicial.ordem.indexOf('heroi') }

    const defesa = aplicarAcao(batalha, { tipo: 'defender' }, criarSorteador(1))
    if (!defesa.ok) throw new Error(defesa.motivo)
    batalha = defesa.estado

    expect(unidadeAtual(batalha)?.ehHeroi).toBe(false)

    const ataque = aplicarAcao(batalha, { tipo: 'atacar', alvoId: 'heroi' }, SEM_VARIACAO)
    if (!ataque.ok) throw new Error(ataque.motivo)

    expect(ataque.estado.fase).toBe('derrota')
  })

  it('fugir encerra a batalha em fuga', () => {
    const resultado = aplicarAcao(batalhaDeTeste(), { tipo: 'fugir' }, criarSorteador(1))

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.estado.fase).toBe('fuga')
  })

  it('depois de encerrada, nenhuma ação é aceita', () => {
    const fugiu = aplicarAcao(batalhaDeTeste(), { tipo: 'fugir' }, criarSorteador(1))
    if (!fugiu.ok) throw new Error(fugiu.motivo)

    const depois = aplicarAcao(
      fugiu.estado,
      { tipo: 'atacar', alvoId: 'grupo-a-0' },
      criarSorteador(1),
    )

    expect(depois.ok).toBe(false)
  })

  it('conta os goblin derrotados', () => {
    expect(goblinsDerrotados(comVida(batalhaDeTeste(), 'grupo-a-0', 0))).toBe(1)
    expect(goblinsDerrotados(batalhaDeTeste())).toBe(0)
  })
})

describe('recompensa de vitória', () => {
  it('dá um ponto por goblin derrotado', () => {
    const comMortos = {
      ...batalhaDeTeste(),
      fase: 'vitoria' as const,
      unidades: batalhaDeTeste().unidades.map((unidade) =>
        unidade.ehHeroi ? unidade : { ...unidade, vida: 0 },
      ),
    }
    const recompensa = recompensaVitoria(comMortos, () => null)

    expect(recompensa.pontosAtributo).toBe(2)
    expect(recompensa.pontosAtributo).toBe(2 * PONTOS_POR_GOBLIN)
    expect(recompensa.loot).toHaveLength(0)
  })

  it('sorteia um drop por goblin derrotado, no chão de quem caiu', () => {
    const encerrada = { ...batalhaDeTeste(), fase: 'vitoria' as const }
    const recompensa = recompensaVitoria(encerrada, () => ({
      id: 'espada-de-ferro',
      nome: 'Espada de ferro',
      bonus: { forca: 3 },
    }))

    expect(recompensa.loot.length).toBeLessThanOrEqual(2)
    for (const item of recompensa.loot) {
      const unidade = unidadeDe(encerrada, item.unidadeId)
      expect(unidade.ehHeroi).toBe(false)
      expect(unidade.vida).toBe(0)
      expect(item.pos).toEqual(unidade.pos)
    }
  })

  it('dá ponto mesmo quando o goblin não deixou drop', () => {
    const comMortos: EstadoBatalha = {
      ...batalhaDeTeste(),
      fase: 'vitoria' as const,
      unidades: batalhaDeTeste().unidades.map((unidade) =>
        unidade.ehHeroi ? unidade : { ...unidade, vida: 0 },
      ),
    }

    expect(recompensaVitoria(comMortos, () => null).pontosAtributo).toBe(2 * PONTOS_POR_GOBLIN)
  })

  it('não dá ponto quando ninguém caiu', () => {
    expect(recompensaVitoria(batalhaDeTeste(), () => null).pontosAtributo).toBe(0)
  })
})

describe('unidades', () => {
  it('o herói entra com vida e mana cheias, e o goblin com 20 de vida', () => {
    const batalha = batalhaDeTeste()
    const heroi = unidadeDe(batalha, 'heroi')

    expect(heroi.vida).toBe(heroi.vidaMaxima)
    expect(heroi.mana).toBe(heroi.manaMaxima)
    expect(unidadeDe(batalha, 'grupo-a-0').vida).toBe(GOBLIN.vidaMaxima)
    expect(unidadeDe(batalha, 'grupo-a-0').manaMaxima).toBe(0)
  })

  it('o arqueiro ataca à distância, os outros de perto', () => {
    expect(heroiDeTeste('arqueiro').tipoAtaque).toBe('distancia')
    expect(heroiDeTeste('cavaleiro').tipoAtaque).toBe('fisico')
    expect(heroiDeTeste('mago').tipoAtaque).toBe('fisico')
  })

  it('o número de goblin segue a quantidade pedida', () => {
    const inimigos = criarUnidadesGoblin('grupo-b', 3, [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ])

    expect(inimigos).toHaveLength(3)
    expect(inimigos.map((goblin) => goblin.id)).toEqual([
      'grupo-b-0',
      'grupo-b-1',
      'grupo-b-2',
    ])
  })

  it('derivado zerado ainda dá vida e ataque utilizáveis', () => {
    const d = derivados(ZERO)

    expect(d.vidaMaxima).toBe(50)
    expect(d.ataqueFisico).toBe(5)
    expect(d.velocidadeMovimento).toBe(VELOCIDADE_BASE)
  })
})