import { describe, expect, it } from 'vitest'
import { derivados, PONTOS_INICIAIS } from '../atributos'
import {
  criarBatalha,
  criarUnidadeHeroi,
  criarUnidadesGoblin,
} from '../combate'
import { DIALOGOS, dialogoDe } from '../dialogos'
import { CHAVE_SAVE } from '../estado'
import {
  FASE_INICIAL,
  PROXIMA_FASE,
  avancarFase,
  ehFaseDeExploracao,
  missaoConcluida,
  podeAvancar,
} from '../missoes'
import {
  VERSAO_SAVE,
  batalhaDoSnapshot,
  criarArmazenamentoLocal,
  criarArmazenamentoMemoria,
  criarSnapshot,
  ehSnapshotValido,
  gravarSnapshot,
  lerSnapshot,
} from '../save'
import type {
  EstadoBatalha,
  FaseMissao,
  Personagem,
  Posicao,
} from '../tipos'

describe('missão', () => {
  it('começa na criação de personagem', () => {
    expect(FASE_INICIAL).toBe('criacao')
  })

  it('anda pelo roteiro da spec, sem pular etapa', () => {
    const roteiro: FaseMissao[] = [
      'criacao',
      'caravana',
      'viagem',
      'batalha',
      'retorno',
      'cidade',
      'continuar',
    ]

    for (let i = 0; i < roteiro.length - 1; i += 1) {
      expect(avancarFase(roteiro[i] as FaseMissao)).toBe(roteiro[i + 1])
    }
  })

  it('para em continuar, que é a tela final', () => {
    expect(podeAvancar('continuar')).toBe(false)
    expect(avancarFase('continuar')).toBe('continuar')
    expect(missaoConcluida('continuar')).toBe(true)
  })

  it('nenhuma fase avança para fora do roteiro', () => {
    const fases = Object.keys(PROXIMA_FASE) as FaseMissao[]

    for (const fase of fases) {
      const proxima = PROXIMA_FASE[fase]
      expect(proxima === null || fases.includes(proxima)).toBe(true)
    }
  })

  it('caravana, viagem e retorno são exploração', () => {
    expect(ehFaseDeExploracao('caravana')).toBe(true)
    expect(ehFaseDeExploracao('viagem')).toBe(true)
    expect(ehFaseDeExploracao('retorno')).toBe(true)
    expect(ehFaseDeExploracao('batalha')).toBe(false)
    expect(ehFaseDeExploracao('criacao')).toBe(false)
  })
})

describe('diálogos', () => {
  it('tem o texto da caravana e o da Rainha', () => {
    expect(dialogoDe('caravana').length).toBeGreaterThan(0)
    expect(dialogoDe('cidade').length).toBeGreaterThan(0)
  })

  it('toda página tem id, nome e texto', () => {
    for (const [rota, paginas] of Object.entries(DIALOGOS)) {
      for (const pagina of paginas) {
        expect(pagina.id.length, rota).toBeGreaterThan(0)
        expect(pagina.texto.length, rota).toBeGreaterThan(0)
      }
    }
  })

  it('nenhum id se repete', () => {
    const ids = Object.values(DIALOGOS).flat().map((pagina) => pagina.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('rota inexistente devolve lista vazia, e não quebra', () => {
    expect(dialogoDe('rota-que-nao-existe')).toEqual([])
  })

  it('a profecia de cem anos está no diálogo da Rainha', () => {
    const texto = dialogoDe('cidade')
      .map((pagina) => pagina.texto)
      .join(' ')

    expect(texto).toContain('cem anos')
    expect(texto).toContain('mártir')
  })
})

function personagemDeTeste(): Personagem {
  return {
    nome: 'Herói',
    raca: 'humano',
    classe: 'cavaleiro',
    pontos: { forca: 4, agilidade: 4, inteligencia: 4 },
    itensEquipados: [],
    pontosLivres: PONTOS_INICIAIS - 12,
  }
}

function batalhaDeTeste(): EstadoBatalha {
  const heroi = criarUnidadeHeroi(
    'heroi',
    'Herói',
    'cavaleiro',
    derivados({ forca: 4, agilidade: 4, inteligencia: 4 }),
    { x: 64, y: 96 },
  )
  const inimigos: readonly Posicao[] = [
    { x: 160, y: 96 },
    { x: 192, y: 96 },
  ]
  return criarBatalha(heroi, criarUnidadesGoblin('grupo-a', 2, inimigos))
}

describe('snapshot da batalha', () => {
  it('guarda personagem, unidades e fase', () => {
    const batalha = batalhaDeTeste()
    const snapshot = criarSnapshot('batalha', personagemDeTeste(), batalha)

    expect(snapshot.versao).toBe(VERSAO_SAVE)
    expect(snapshot.faseMissao).toBe('batalha')
    expect(snapshot.unidadeHeroi.vida).toBe(heroiVidaEsperada())
    expect(snapshot.unidadesInimigas).toHaveLength(2)
  })

  it('devolve a batalha exatamente como estava', () => {
    const batalha = batalhaDeTeste()
    const restaurada = batalhaDoSnapshot(criarSnapshot('batalha', personagemDeTeste(), batalha))

    expect(restaurada.fase).toBe('ativa')
    expect(restaurada.indiceTurno).toBe(0)
    expect(restaurada.unidades.map((unidade) => unidade.id)).toEqual(
      batalha.unidades.map((unidade) => unidade.id),
    )
    expect(restaurada.unidades.map((unidade) => unidade.vida)).toEqual(
      batalha.unidades.map((unidade) => unidade.vida),
    )
  })

  it('não deixa o snapshot sharing com a batalha original', () => {
    const batalha = batalhaDeTeste()
    const snapshot = criarSnapshot('batalha', personagemDeTeste(), batalha)
    const restaurada = batalhaDoSnapshot(snapshot)

    restaurada.unidades.forEach((unidade, indice) => {
      expect(unidade.vida).toBe(batalha.unidades[indice]?.vida)
    })
    expect(restaurada.unidades[0]).not.toBe(batalha.unidades[0])
  })

  it('sobe e desce por JSON', () => {
    const snapshot = criarSnapshot('batalha', personagemDeTeste(), batalhaDeTeste())

    expect(lerSnapshot(gravarSnapshot(snapshot))).toEqual(snapshot)
  })

  it('descarta save corrompido, sem quebrar', () => {
    expect(lerSnapshot('isto nao e json')).toBeNull()
    expect(lerSnapshot(null)).toBeNull()
    expect(lerSnapshot('{}')).toBeNull()
    expect(lerSnapshot('{"versao":99}')).toBeNull()
  })

  it('recusa save de outra versão', () => {
    const snapshot = { ...criarSnapshot('batalha', personagemDeTeste(), batalhaDeTeste()), versao: 0 }

    expect(ehSnapshotValido(snapshot)).toBe(false)
    expect(lerSnapshot(gravarSnapshot(snapshot))).toBeNull()
  })

  it('recusa valor que não é objeto', () => {
    expect(ehSnapshotValido(null)).toBe(false)
    expect(ehSnapshotValido('texto')).toBe(false)
    expect(ehSnapshotValido(42)).toBe(false)
  })

  it('não guarda snapshot sem herói', () => {
    const batalha: EstadoBatalha = {
      ...batalhaDeTeste(),
      unidades: batalhaDeTeste().unidades.filter((unidade) => !unidade.ehHeroi),
    }

    expect(() => criarSnapshot('batalha', personagemDeTeste(), batalha)).toThrow()
  })
})

describe('armazenamento', () => {
  it('o de memória guarda e devolve', () => {
    const armazenamento = criarArmazenamentoMemoria()
    const snapshot = criarSnapshot('batalha', personagemDeTeste(), batalhaDeTeste())

    armazenamento.gravar(gravarSnapshot(snapshot))

    expect(armazenamento.ler()).not.toBeNull()
    expect(lerSnapshot(armazenamento.ler())).toEqual(snapshot)
  })

  it('o de memória começa vazio', () => {
    expect(criarArmazenamentoMemoria().ler()).toBeNull()
  })

  it('o do navegador usa localStorage quando existe', () => {
    const guardado: Record<string, string> = {}
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (chave: string) => guardado[chave] ?? null,
        setItem: (chave: string, valor: string) => {
          guardado[chave] = valor
        },
      },
      configurable: true,
    })

    try {
      const armazenamento = criarArmazenamentoLocal(CHAVE_SAVE)
      armazenamento.gravar('valor')
      expect(armazenamento.ler()).toBe('valor')
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        configurable: true,
      })
    }
  })

  it('o do navegador aguenta localStorage que lança erro', () => {
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => {
          throw new Error('modo privado')
        },
        setItem: () => {
          throw new Error('modo privado')
        },
      },
      configurable: true,
    })

    try {
      const armazenamento = criarArmazenamentoLocal(CHAVE_SAVE)
      expect(() => armazenamento.gravar('valor')).not.toThrow()
      expect(armazenamento.ler()).toBeNull()
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        configurable: true,
      })
    }
  })

  it('sem localStorage no ambiente, não quebra', () => {
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true })

    try {
      const armazenamento = criarArmazenamentoLocal(CHAVE_SAVE)
      armazenamento.gravar('valor')
      expect(armazenamento.ler()).toBeNull()
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        configurable: true,
      })
    }
  })
})

function heroiVidaEsperada(): number {
  return derivados({ forca: 4, agilidade: 4, inteligencia: 4 }).vidaMaxima
}