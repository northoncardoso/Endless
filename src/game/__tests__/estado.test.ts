import { describe, expect, it } from 'vitest'
import { PONTOS_INICIAIS } from '../atributos'
import { CUSTO_HABILIDADE, unidadeAtual, unidadePorId } from '../combate'
import { criarSorteador, type Sorteador } from '../random'
import { criarArmazenamentoMemoria } from '../save'
import {
  ESTADO_INICIAL,
  POSICAO_HEROI_BATALHA,
  reducer,
  type Dependencias,
  type EstadoJogo,
} from '../estado'
import type { Classe, EstadoBatalha, Posicao, Raca } from '../tipos'

const POS_INIMIGOS: readonly Posicao[] = [
  { x: 160, y: 96 },
  { x: 192, y: 96 },
]

const SEM_VARIACAO: Sorteador = () => 0.5
const VARIACAO_MAXIMA: Sorteador = () => 1

function deps(rng: Sorteador = criarSorteador(1)): Dependencias {
  return { rng, armazenamento: criarArmazenamentoMemoria() }
}

function batalhaDe(estado: EstadoJogo): EstadoBatalha {
  const batalha = estado.batalha
  if (batalha === null) throw new Error('esperava batalha em andamento')
  return batalha
}

function criar(
  classe: Classe = 'cavaleiro',
  raca: Raca = 'humano',
  pontos: Readonly<Record<'forca' | 'agilidade' | 'inteligencia', number>> = {
    forca: 4,
    agilidade: 4,
    inteligencia: 4,
  },
): EstadoJogo {
  let estado = reducer(
    ESTADO_INICIAL,
    { tipo: 'criarPersonagem', nome: 'Herói', raca, classe },
    deps(),
  )

  for (let i = 0; i < PONTOS_INICIAIS; i += 1) {
    const atributo = i < pontos.forca
      ? 'forca'
      : i < pontos.forca + pontos.agilidade
        ? 'agilidade'
        : 'inteligencia'
    estado = reducer(estado, { tipo: 'distribuirPonto', atributo }, deps())
  }

  return estado
}

function emBatalha(estado: EstadoJogo): EstadoJogo {
  const viagem = reducer(estado, { tipo: 'avancarMissao' }, deps())
  return reducer(
    viagem,
    { tipo: 'iniciarBatalha', grupoId: 'grupo-a', posInimigos: POS_INIMIGOS },
    deps(),
  )
}

// Ataca até a batalha acabar, sempre mirando quem está vivo do outro lado.
function jogarAteFim(
  estadoInicial: EstadoJogo,
  rng: Sorteador = SEM_VARIACAO,
): EstadoJogo {
  let estado = estadoInicial
  let guarda = 0

  while (estado.batalha !== null && estado.batalha.fase === 'ativa' && guarda < 40) {
    const batalha = batalhaDe(estado)
    const unidade = unidadeAtual(batalha)
    if (unidade === undefined) break
    const alvo = batalha.unidades.find(
      (outra) => outra.ehHeroi !== unidade.ehHeroi && outra.vida > 0,
    )
    if (alvo === undefined) break
    estado = reducer(
      estado,
      { tipo: 'agir', acao: { tipo: 'atacar', alvoId: alvo.id } },
      deps(rng),
    )
    guarda += 1
  }

  return estado
}

describe('criação de personagem', () => {
  it('começa vazio, na criação', () => {
    expect(ESTADO_INICIAL.fase).toBe('criacao')
    expect(ESTADO_INICIAL.personagem).toBeNull()
  })

  it('cria o personagem e fica na criação, com os 12 pontos livres', () => {
    const estado = reducer(
      ESTADO_INICIAL,
      { tipo: 'criarPersonagem', nome: 'Herói', raca: 'humano', classe: 'cavaleiro' },
      deps(),
    )

    expect(estado.fase).toBe('criacao')
    expect(estado.personagem?.pontos).toEqual({ forca: 0, agilidade: 0, inteligencia: 0 })
    expect(estado.personagem?.pontosLivres).toBe(PONTOS_INICIAIS)
  })

  it('distribui ponto a ponto, até zerar os 12', () => {
    const estado = criar('cavaleiro', 'humano', { forca: 12, agilidade: 0, inteligencia: 0 })

    expect(estado.personagem?.pontos).toEqual({ forca: 12, agilidade: 0, inteligencia: 0 })
    expect(estado.personagem?.pontosLivres).toBe(0)
  })

  it('não distribui ponto depois dos 12', () => {
    const cheio = criar()
    const resultado = reducer(cheio, { tipo: 'distribuirPonto', atributo: 'forca' }, deps())

    expect(resultado.personagem?.pontos.forca).toBe(4)
    expect(resultado.aviso).not.toBeNull()
  })

  it('não deixa sair da criação com ponto sobrando', () => {
    const comPonto = reducer(
      reducer(
        ESTADO_INICIAL,
        { tipo: 'criarPersonagem', nome: 'Herói', raca: 'humano', classe: 'cavaleiro' },
        deps(),
      ),
      { tipo: 'distribuirPonto', atributo: 'forca' },
      deps(),
    )

    const resultado = reducer(comPonto, { tipo: 'avancarMissao' }, deps())

    expect(resultado.fase).toBe('criacao')
    expect(resultado.aviso).toContain('11')
  })

  it('sem personagem, entrar em batalha é recusado', () => {
    const estado = reducer(
      ESTADO_INICIAL,
      { tipo: 'iniciarBatalha', grupoId: 'grupo-a', posInimigos: POS_INIMIGOS },
      deps(),
    )

    expect(estado.batalha).toBeNull()
    expect(estado.aviso).not.toBeNull()
  })
})

describe('missão', () => {
  it('avança da criação para a caravana, e daí para a viagem', () => {
    const estado = criar()
    const caravana = reducer(estado, { tipo: 'avancarMissao' }, deps())
    const viagem = reducer(caravana, { tipo: 'avancarMissao' }, deps())

    expect(caravana.fase).toBe('caravana')
    expect(viagem.fase).toBe('viagem')
  })

  it('entrar em batalha muda a fase para batalha e monta as 3 unidades', () => {
    const estado = emBatalha(criar())

    expect(estado.fase).toBe('batalha')
    expect(batalhaDe(estado).unidades).toHaveLength(3)
    expect(estado.snapshot).not.toBeNull()
  })

  it('a batalha grava o snapshot no armazenamento', () => {
    const armazenamento = criarArmazenamentoMemoria()
    const estado = reducer(
      { ...criar(), fase: 'viagem' },
      { tipo: 'iniciarBatalha', grupoId: 'grupo-a', posInimigos: POS_INIMIGOS },
      { rng: criarSorteador(1), armazenamento },
    )

    expect(armazenamento.ler()).not.toBeNull()
    expect(estado.snapshot?.faseMissao).toBe('viagem')
  })
})

describe('bag', () => {
  const comEspada: EstadoJogo = {
    ...criar(),
    bag: [{ id: 'espada-de-ferro', nome: 'Espada de ferro', bonus: { forca: 3 } }],
  }

  it('equipar tira da bag e põe nos equipados', () => {
    const estado = reducer(comEspada, { tipo: 'equipar', itemId: 'espada-de-ferro' }, deps())

    expect(estado.bag).toHaveLength(0)
    expect(estado.personagem?.itensEquipados).toEqual(['espada-de-ferro'])
  })

  it('equipar item que não está na bag é recusado', () => {
    const estado = reducer(criar(), { tipo: 'equipar', itemId: 'espada-de-ferro' }, deps())

    expect(estado.personagem?.itensEquipados).toEqual([])
    expect(estado.aviso).not.toBeNull()
  })

  it('desequipar devolve o item para a bag', () => {
    const equipado = reducer(comEspada, { tipo: 'equipar', itemId: 'espada-de-ferro' }, deps())

    const estado = reducer(equipado, { tipo: 'desequipar', itemId: 'espada-de-ferro' }, deps())

    expect(estado.personagem?.itensEquipados).toEqual([])
    expect(estado.bag.map((item) => item.id)).toEqual(['espada-de-ferro'])
  })

  it('o item equipado muda a vida máxima na batalha seguinte', () => {
    const semEspada = reducer(criar(), { tipo: 'avancarMissao' }, deps())
    const comEspadaPronta = reducer(
      comEspada,
      { tipo: 'equipar', itemId: 'espada-de-ferro' },
      deps(),
    )

    const vidaSem = emBatalha(semEspada).batalha?.unidades.find((u) => u.ehHeroi)?.vidaMaxima
    const vidaCom = emBatalha(comEspadaPronta).batalha?.unidades.find((u) => u.ehHeroi)?.vidaMaxima

    expect(vidaCom).toBe((vidaSem ?? 0) + 24)
  })
})

describe('batalha', () => {
  it('o herói entra na posição de batalha com vida e mana cheias', () => {
    const heroi = unidadePorId(batalhaDe(emBatalha(criar())), 'heroi')

    expect(heroi?.pos).toEqual(POSICAO_HEROI_BATALHA)
    expect(heroi?.vida).toBe(heroi?.vidaMaxima)
    expect(heroi?.mana).toBe(heroi?.manaMaxima)
  })

  it('ação recusada não muda a batalha', () => {
    const estado = emBatalha(criar())
    const resultado = reducer(
      estado,
      { tipo: 'agir', acao: { tipo: 'atacar', alvoId: 'heroi' } },
      deps(SEM_VARIACAO),
    )

    expect(unidadePorId(batalhaDe(resultado), 'grupo-a-0')?.vida).toBe(20)
    expect(resultado.batalha).toBe(batalhaDe(estado))
  })

  it('o herói sozinho vence e volta para o retorno', () => {
    const estado = jogarAteFim(emBatalha(criar()))

    expect(estado.batalha).toBeNull()
    expect(estado.fase).toBe('retorno')
    expect(estado.aviso).toBeNull()
  })

  it('vencer dá 1 ponto por goblin e um drop por goblin, no pior dia', () => {
    const estado = jogarAteFim(emBatalha(criar()), () => 0)

    expect(estado.pontosPendente).toBe(2)
    expect(estado.bag).toHaveLength(2)
    expect(estado.fase).toBe('retorno')
  })

  it('vencer nunca dá mais que um drop por goblin', () => {
    const estado = jogarAteFim(emBatalha(criar()), () => 0.99)

    expect(estado.bag.length).toBeLessThanOrEqual(2)
    expect(estado.pontosPendente).toBe(2)
  })

  it('fugir volta para o retorno, sem drop e sem ponto', () => {
    const estado = reducer(emBatalha(criar()), { tipo: 'agir', acao: { tipo: 'fugir' } }, deps())

    expect(estado.fase).toBe('retorno')
    expect(estado.bag).toHaveLength(0)
    expect(estado.pontosPendente).toBe(0)
    expect(estado.batalha).toBeNull()
  })

  it('gastar o ponto pendente distribui atributo e leva à cidade', () => {
    const comPonto = { ...jogarAteFim(emBatalha(criar())), pontosPendente: 1 }
    const antes = comPonto.personagem?.pontos.forca ?? 0

    const resultado = reducer(comPonto, { tipo: 'gastarPonto', atributo: 'forca' }, deps())

    expect(resultado.personagem?.pontos.forca).toBe(antes + 1)
    expect(resultado.pontosPendente).toBe(0)
    expect(resultado.fase).toBe('cidade')
  })

  it('não gasta ponto que não existe', () => {
    const resultado = reducer(criar(), { tipo: 'gastarPonto', atributo: 'forca' }, deps())

    expect(resultado.personagem?.pontos.forca).toBe(4)
    expect(resultado.aviso).not.toBeNull()
  })

  it('ponto de batalha é bônus, e não volta a existir depois de gasto', () => {
    const comPonto = { ...jogarAteFim(emBatalha(criar())), pontosPendente: 2 }

    const primeiro = reducer(comPonto, { tipo: 'gastarPonto', atributo: 'forca' }, deps())
    const segundo = reducer(primeiro, { tipo: 'gastarPonto', atributo: 'forca' }, deps())
    const terceiro = reducer(segundo, { tipo: 'gastarPonto', atributo: 'forca' }, deps())

    expect(primeiro.pontosPendente).toBe(1)
    expect(segundo.pontosPendente).toBe(0)
    expect(terceiro.pontosPendente).toBe(0)
    expect(terceiro.personagem?.pontos.forca).toBe(6)
    expect(terceiro.aviso).not.toBeNull()
  })

  it('ponto gasto não volta a ser ponto livre da criação', () => {
    const comPonto = { ...jogarAteFim(emBatalha(criar())), pontosPendente: 1 }
    const estado = reducer(comPonto, { tipo: 'gastarPonto', atributo: 'forca' }, deps())

    expect(estado.personagem?.pontosLivres).toBe(0)
  })

  it('depois da criação, distribuir ponto é recusado', () => {
    const estado = reducer(emBatalha(criar()), { tipo: 'distribuirPonto', atributo: 'forca' }, deps())

    expect(estado.personagem?.pontos.forca).toBe(4)
    expect(estado.aviso).not.toBeNull()
  })

  it('herói fraco perde, e a batalha fica parada na derrota', () => {
    const fraco = criar('cavaleiro', 'humano', { forca: 0, agilidade: 0, inteligencia: 12 })
    const estado = jogarAteFim(emBatalha(fraco), VARIACAO_MAXIMA)

    expect(estado.batalha?.fase).toBe('derrota')
    expect(estado.fase).toBe('batalha')
  })

  it('na derrota, agir é recusado', () => {
    const fraco = criar('cavaleiro', 'humano', { forca: 0, agilidade: 0, inteligencia: 12 })
    const estado = jogarAteFim(emBatalha(fraco), VARIACAO_MAXIMA)

    const resultado = reducer(
      estado,
      { tipo: 'agir', acao: { tipo: 'atacar', alvoId: 'grupo-a-0' } },
      deps(),
    )

    expect(resultado.batalha).toBe(batalhaDe(estado))
  })

  it('desistir da derrota volta para a criação, sem personagem', () => {
    const fraco = criar('cavaleiro', 'humano', { forca: 0, agilidade: 0, inteligencia: 12 })
    const derrotado = jogarAteFim(emBatalha(fraco), VARIACAO_MAXIMA)

    const resultado = reducer(derrotado, { tipo: 'abandonarBatalha' }, deps())

    expect(resultado.fase).toBe('criacao')
    expect(resultado.personagem).toBeNull()
    expect(resultado.batalha).toBeNull()
    expect(resultado.aviso).toBe('Você foi derrotado')
  })

  it('reiniciar devolve exatamente o estado do início da batalha', () => {
    const estado = emBatalha(criar())
    const vidaInicial = unidadePorId(batalhaDe(estado), 'grupo-a-0')?.vida

    const machucado = reducer(
      estado,
      { tipo: 'agir', acao: { tipo: 'atacar', alvoId: 'grupo-a-0' } },
      deps(SEM_VARIACAO),
    )
    expect(unidadePorId(batalhaDe(machucado), 'grupo-a-0')?.vida).toBeLessThan(20)

    const reiniciado = reducer(machucado, { tipo: 'reiniciarBatalha' }, deps())

    expect(batalhaDe(reiniciado).fase).toBe('ativa')
    expect(batalhaDe(reiniciado).indiceTurno).toBe(0)
    expect(unidadePorId(batalhaDe(reiniciado), 'grupo-a-0')?.vida).toBe(vidaInicial)
    expect(unidadePorId(batalhaDe(reiniciado), 'heroi')?.vida).toBe(
      unidadePorId(batalhaDe(estado), 'heroi')?.vida,
    )
  })

  it('reiniciar sem snapshot é recusado', () => {
    const resultado = reducer(criar(), { tipo: 'reiniciarBatalha' }, deps())

    expect(resultado.batalha).toBeNull()
    expect(resultado.aviso).not.toBeNull()
  })
})

describe('mago', () => {
  it('tem mana suficiente para a habilidade e paga o custo', () => {
    const mago = criar('mago', 'elfo')
    const estado = emBatalha(mago)
    const manaInicial = unidadePorId(batalhaDe(estado), 'heroi')?.manaMaxima ?? 0

    expect(manaInicial).toBeGreaterThan(CUSTO_HABILIDADE)

    const resultado = reducer(
      estado,
      { tipo: 'agir', acao: { tipo: 'habilidade', alvoId: 'grupo-a-0' } },
      deps(SEM_VARIACAO),
    )

    expect(unidadePorId(batalhaDe(resultado), 'heroi')?.mana).toBe(
      manaInicial - CUSTO_HABILIDADE,
    )
    expect(unidadePorId(batalhaDe(resultado), 'grupo-a-0')?.vida).toBeLessThan(20)
  })
})