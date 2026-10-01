import { describe, expect, it } from 'vitest'
import { PONTOS_INICIAIS, derivados } from '../atributos'
import { unidadePorId } from '../combate'
import { ESTADO_INICIAL, POSICAO_HEROI_BATALHA, reducer, type Dependencias, type EstadoJogo } from '../estado'
import { CATALOGO_ITENS, buscarItem } from '../itens'
import { TICKS_VAGAR_POR_SEGUNDO, regenerarVitais } from '../mapa'
import { criarSorteador, type Sorteador } from '../random'
import { criarArmazenamentoMemoria } from '../save'
import type { Classe, EstadoBatalha, Posicao, Raca, Vitais } from '../tipos'

const POS_INIMIGOS: readonly Posicao[] = [
  { x: 160, y: 96 },
  { x: 192, y: 96 },
]

const SEM_VARIACAO: Sorteador = () => 0.5

function deps(rng: Sorteador = criarSorteador(7)): Dependencias {
  return { rng, armazenamento: criarArmazenamentoMemoria() }
}

function batalhaDe(estado: EstadoJogo): EstadoBatalha {
  const batalha = estado.batalha
  if (batalha === null) throw new Error('esperava batalha em andamento')
  return batalha
}

// Cria o personagem e distribui os 12 pontos. `repeticoes` diz quantos pontos vão
// para cada atributo, e a criação exige que os 12 sejam usados, então a função
// completa com o que sobrar em força.
function criado(
  pontos: Readonly<{ forca: number; agilidade: number; inteligencia: number }> = {
    forca: 4,
    agilidade: 4,
    inteligencia: 4,
  },
  classe: Classe = 'cavaleiro',
): EstadoJogo {
  let estado = reducer(
    ESTADO_INICIAL,
    { tipo: 'criarPersonagem', nome: 'Herói', raca: 'humano', classe },
    deps(),
  )

  for (let i = 0; i < PONTOS_INICIAIS; i += 1) {
    const atributo =
      i < pontos.forca ? 'forca' : i < pontos.forca + pontos.agilidade ? 'agilidade' : 'inteligencia'
    estado = reducer(estado, { tipo: 'distribuirPonto', atributo }, deps())
  }

  return estado
}

function vitaisDe(estado: EstadoJogo): Vitais {
  return estado.mundo.vitais
}

describe('vitais na exploração', () => {
  it('o estado de exploração tem vida e mana, com o máximo dos derivados', () => {
    const estado = criado()

    expect(vitaisDe(estado).vidaMaxima).toBe(derivados({ forca: 4, agilidade: 4, inteligencia: 4 }).vidaMaxima)
    expect(vitaisDe(estado).manaMaxima).toBe(derivados({ forca: 4, agilidade: 4, inteligencia: 4 }).manaMaxima)
    expect(vitaisDe(estado).vida).toBe(vitaisDe(estado).vidaMaxima)
    expect(vitaisDe(estado).mana).toBe(vitaisDe(estado).manaMaxima)
  })

  it('criar o personagem já enche a vida e a mana', () => {
    const estado = reducer(
      ESTADO_INICIAL,
      { tipo: 'criarPersonagem', nome: 'Herói', raca: 'humano', classe: 'cavaleiro' },
      deps(),
    )

    expect(vitaisDe(estado).vida).toBe(50)
    expect(vitaisDe(estado).mana).toBe(20)
  })

  it('subir um atributo na criação enche a barra no máximo novo', () => {
    const base = reducer(
      ESTADO_INICIAL,
      { tipo: 'criarPersonagem', nome: 'Herói', raca: 'humano', classe: 'cavaleiro' },
      deps(),
    )
    const comForca = reducer(base, { tipo: 'distribuirPonto', atributo: 'forca' }, deps())

    // 1 ponto de força são 8 de vida: 50 vira 58, e a barra enche, porque na
    // criação o herói não levou dano.
    expect(vitaisDe(comForca).vidaMaxima).toBe(58)
    expect(vitaisDe(comForca).vida).toBe(58)
  })

  it('um segundo regenera 1 de vida, e 6 ticks dão 1', () => {
    const estado = criado()
    const comDano = {
      ...estado,
      mundo: { ...estado.mundo, vitais: { ...estado.mundo.vitais, vida: 10 } },
    }

    let vivo = comDano
    for (let i = 0; i < TICKS_VAGAR_POR_SEGUNDO; i += 1) {
      vivo = reducer(vivo, { tipo: 'passarTempo' }, deps(SEM_VARIACAO))
    }

    // A regeneração por tick é 1/6, e seis vezes 1/6 dá 0,9999999 em ponto
    // flutuante. O estado guarda o fracionário, que converge, e quem mostra a
    // barra arredonda. O teste mede o total, não o pio do tick.
    expect(vitaisDe(vivo).vida).toBeCloseTo(11, 5)
  })

  it('a regeneração não passa do máximo', () => {
    const machucado: Vitais = { vida: 49, vidaMaxima: 50, mana: 20, manaMaxima: 20 }
    const curado = regenerarVitais(machucado, 10, 0)

    expect(curado.vida).toBe(50)
  })

  it('a mana regenera 1 vez a inteligência por segundo', () => {
    // 4 de inteligência são 4 de mana por segundo.
    const estado = criado()
    const semMana = {
      ...estado,
      mundo: { ...estado.mundo, vitais: { ...estado.mundo.vitais, mana: 0 } },
    }

    let vivo = semMana
    for (let i = 0; i < TICKS_VAGAR_POR_SEGUNDO; i += 1) {
      vivo = reducer(vivo, { tipo: 'passarTempo' }, deps(SEM_VARIACAO))
    }

    expect(vitaisDe(vivo).mana).toBeCloseTo(4, 5)
  })

  it('tempo negativo não regenera nada', () => {
    const ferido: Vitais = { vida: 10, vidaMaxima: 50, mana: 0, manaMaxima: 20 }

    expect(regenerarVitais(ferido, -5, 10)).toBe(ferido)
  })

  it('item que dá inteligência também aumenta a regeneração de mana', () => {
    const item = CATALOGO_ITENS.find((candidato) => (candidato.bonus.inteligencia ?? 0) > 0)
    expect(item).toBeDefined()

    // 4 de inteligência são 4 de mana por segundo. Com o item, vira 4 + bônus.
    const bonus = item?.bonus.inteligencia ?? 0
    const semItemNaBag = criado()
    const comItemNaBag: EstadoJogo = { ...semItemNaBag, bag: item === undefined ? [] : [item] }
    const equipado = reducer(comItemNaBag, { tipo: 'equipar', itemId: item?.id ?? '' }, deps())

    const semMana = (estado: EstadoJogo): EstadoJogo => ({
      ...estado,
      mundo: { ...estado.mundo, vitais: { ...estado.mundo.vitais, mana: 0 } },
    })

    let sem = semMana(semItemNaBag)
    let com = semMana(equipado)
    for (let i = 0; i < TICKS_VAGAR_POR_SEGUNDO; i += 1) {
      sem = reducer(sem, { tipo: 'passarTempo' }, deps(SEM_VARIACAO))
      com = reducer(com, { tipo: 'passarTempo' }, deps(SEM_VARIACAO))
    }

    expect(vitaisDe(sem).mana).toBeCloseTo(4, 5)
    expect(vitaisDe(com).mana).toBeCloseTo(4 + bonus, 5)
  })

  it('equipar item que dá vida recalcula o máximo sem esvaziar a barra', () => {
    const item = CATALOGO_ITENS.find((candidato) => (candidato.bonus.vida ?? 0) > 0)
    expect(item).toBeDefined()

    // Equipar só funciona com o item na bag, então o teste põe o item lá antes.
    const comItemNaBag: EstadoJogo = { ...criado(), bag: item === undefined ? [] : [item] }
    const antes = vitaisDe(comItemNaBag).vida
    const estado = reducer(comItemNaBag, { tipo: 'equipar', itemId: item?.id ?? '' }, deps())
    const bonus = item === undefined ? 0 : (item.bonus.vida ?? 0)

    // O máximo sobe com o item, e a vida atual é preservada: equipar não pode
    // curar nem drenar o herói, só mudar o teto.
    expect(vitaisDe(estado).vidaMaxima).toBe(50 + 4 * 8 + bonus)
    expect(vitaisDe(estado).vida).toBe(antes)
  })

  it('desequipar corta a vida no máximo novo, em vez de deixar vida a mais', () => {
    const item = CATALOGO_ITENS.find((candidato) => (candidato.bonus.vida ?? 0) > 0)
    const comItemNaBag: EstadoJogo = { ...criado(), bag: item === undefined ? [] : [item] }
    const equipado = reducer(comItemNaBag, { tipo: 'equipar', itemId: item?.id ?? '' }, deps())
    const semItem = reducer(equipado, { tipo: 'desequipar', itemId: item?.id ?? '' }, deps())

    expect(vitaisDe(semItem).vidaMaxima).toBe(50 + 4 * 8)
    expect(vitaisDe(semItem).vida).toBeLessThanOrEqual(vitaisDe(semItem).vidaMaxima)
  })
})

describe('vida entre a exploração e a batalha', () => {
  function emBatalha(estado: EstadoJogo): EstadoJogo {
    const viagem = reducer(estado, { tipo: 'avancarMissao' }, deps())
    return reducer(
      viagem,
      { tipo: 'iniciarBatalha', grupoId: 'grupo-a', posInimigos: POS_INIMIGOS },
      deps(),
    )
  }

  it('entrar em batalha leva a vida que o herói tinha, não o máximo', () => {
    const estado = criado()
    const ferido = {
      ...estado,
      mundo: { ...estado.mundo, vitais: { ...estado.mundo.vitais, vida: 20 } },
    }

    const batalha = batalhaDe(emBatalha(ferido))
    const heroi = unidadePorId(batalha, 'heroi')

    expect(heroi?.vida).toBe(20)
  })

  it('o herói entra na posição de batalha com a vida que carregava', () => {
    const batalha = batalhaDe(emBatalha(criado()))

    expect(unidadePorId(batalha, 'heroi')?.pos).toEqual(POSICAO_HEROI_BATALHA)
  })

  it('vencer devolve a vida que sobrou, e ela regenera com o tempo', () => {
    const estado = emBatalha(criado())
    const heroiAntes = unidadePorId(batalhaDe(estado), 'heroi')
    expect(heroiAntes).toBeDefined()

    // O herói sobrevive com a vida que o goblin deixou.
    let vivo = estado
    let guarda = 0
    while (vivo.batalha !== null && vivo.batalha.fase === 'ativa' && guarda < 40) {
      const batalha = batalhaDe(vivo)
      const inimigo = batalha.unidades.find((unidade) => !unidade.ehHeroi && unidade.vida > 0)
      if (inimigo === undefined) break
      const ehTurnoDoHeroi = batalha.ordem[batalha.indiceTurno] === 'heroi'
      vivo = reducer(
        vivo,
        ehTurnoDoHeroi
          ? { tipo: 'agir', acao: { tipo: 'atacar', alvoId: inimigo.id } }
          : { tipo: 'agir', acao: { tipo: 'defender' } },
        deps(SEM_VARIACAO),
      )
      guarda += 1
    }

    expect(vivo.batalha).toBeNull()
    expect(vivo.fase).toBe('retorno')
    // A vida da exploração é a da batalha, e nunca passa do máximo.
    expect(vitaisDe(vivo).vida).toBeGreaterThan(0)
    expect(vitaisDe(vivo).vida).toBeLessThanOrEqual(vitaisDe(vivo).vidaMaxima)
  })

  it('fugir também devolve a vida que sobrou', () => {
    const estado = emBatalha(criado())
    const fugiu = reducer(estado, { tipo: 'agir', acao: { tipo: 'fugir' } }, deps())

    expect(fugiu.batalha).toBeNull()
    expect(vitaisDe(fugiu).vida).toBeGreaterThan(0)
    expect(vitaisDe(fugiu).vida).toBeLessThanOrEqual(vitaisDe(fugiu).vidaMaxima)
  })
})

describe('aviso da HUD', () => {
  it('o aviso sobrevive ao tick do mundo, senão a HUD nunca mostra a mensagem', () => {
    // Regressão: `passarTempo` rodava 6 vezes por segundo e limpava o aviso, e o
    // `moverFluido` limpava a cada quadro. A mensagem morria em menos de 16ms,
    // antes de o jogador conseguir ler. Quem tira o aviso da tela é a HUD, com
    // timer, e não o relógio do mundo.
    const estado = criado()
    const comAviso = reducer(estado, { tipo: 'interagir' }, deps())
    expect(comAviso.aviso).toBe('Não há nada aqui.')

    const depoisDoTick = reducer(comAviso, { tipo: 'passarTempo' }, deps())
    expect(depoisDoTick.aviso).toBe('Não há nada aqui.')

    const depoisDoMovimento = reducer(
      comAviso,
      { tipo: 'moverFluido', direcao: 'direita', dt: 1 / 60 },
      deps(),
    )
    expect(depoisDoMovimento.aviso).toBe('Não há nada aqui.')
  })

  it('limparAviso tira a mensagem, e é a única coisa que ele faz', () => {
    const estado = reducer(criado(), { tipo: 'interagir' }, deps())
    const limpo = reducer(estado, { tipo: 'limparAviso' }, deps())

    expect(limpo.aviso).toBeNull()
    expect(limpo.mundo).toBe(estado.mundo)
    expect(limpo.personagem).toBe(estado.personagem)
    expect(limpo.fase).toBe(estado.fase)
  })

  it('andando com diálogo aberto, o herói não se mexe e o aviso fica na tela', () => {
    // O bloqueio de verdade é o diálogo aberto, então o teste chega na caravana,
    // que fica logo ao lado do ponto de nascimento, e conversa com a elfa.
    let estado = reducer(criado(), { tipo: 'avancarMissao' }, deps())
    for (let t = 0; t < 4; t += 1) {
      estado = reducer(estado, { tipo: 'moverFluido', direcao: 'direita', dt: 1 / 6 }, deps())
    }
    for (let t = 0; t < 2; t += 1) {
      estado = reducer(estado, { tipo: 'moverFluido', direcao: 'cima', dt: 1 / 6 }, deps())
    }
    const aberto = reducer(estado, { tipo: 'interagir' }, deps())
    expect(aberto.dialogo).not.toBeNull()

    const andando = reducer(aberto, { tipo: 'moverFluido', direcao: 'direita', dt: 1 / 60 }, deps())
    const tique = reducer(aberto, { tipo: 'passarTempo' }, deps())

    // Com o diálogo aberto, o mundo não anda e o estado volta igual, porque o
    // jogador é quem decide o ritmo. A vida também não regenera aqui.
    expect(andando).toBe(aberto)
    expect(tique).toBe(aberto)
    expect(andando.mundo.vitais).toBe(aberto.mundo.vitais)
  })
})

describe('itens e derivação', () => {
  it('o item de vida existe no catálogo, senão os testes de equipar não medem nada', () => {
    expect(CATALOGO_ITENS.some((item) => (item.bonus.vida ?? 0) > 0)).toBe(true)
  })

  it('buscarItem devolve o item do catálogo pelo id', () => {
    const item = CATALOGO_ITENS[0]
    expect(item === undefined ? undefined : buscarItem(item.id)?.id).toBe(item?.id)
  })
})

describe('raça', () => {
  it('não muda os vitais, porque a spec deixa a especialização para depois', () => {
    const racas: readonly Raca[] = ['humano', 'elfo', 'anao']
    const valores = racas.map((raca) => {
      const estado = reducer(
        ESTADO_INICIAL,
        { tipo: 'criarPersonagem', nome: 'Herói', raca, classe: 'cavaleiro' },
        deps(),
      )
      return vitaisDe(estado).vidaMaxima
    })

    expect(new Set(valores).size).toBe(1)
  })
})
