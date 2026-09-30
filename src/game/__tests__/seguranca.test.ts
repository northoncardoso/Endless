import { describe, expect, it } from 'vitest'
import { criarBatalha, criarUnidadeHeroi, criarUnidadesGoblin } from '../combate'
import { derivados, ZERO } from '../atributos'
import { criarSnapshot, lerSnapshot, TAMANHO_MAXIMO_SAVE, VERSAO_SAVE, gravarSnapshot } from '../save'
import { ehSnapshotValido, ehUnidadeValida } from '../validacao'
import type { EstadoBatalha, Personagem, Posicao, Unidade } from '../tipos'

// Suíte de segurança do save, separada das suítes de regra. Aqui o que está sob
// teste é o que acontece com dado adulterado, não o comportamento do jogo.

const INIMIGOS: readonly Posicao[] = [
  { x: 160, y: 96 },
  { x: 192, y: 96 },
]

function heroi(): Unidade {
  return criarUnidadeHeroi('heroi', 'Herói', 'cavaleiro', derivados(ZERO), { x: 64, y: 96 })
}

function batalha(): EstadoBatalha {
  return criarBatalha(heroi(), criarUnidadesGoblin('grupo-a', 2, INIMIGOS))
}

function personagem(): Personagem {
  return {
    nome: 'Herói',
    raca: 'humano',
    classe: 'cavaleiro',
    pontos: { ...ZERO },
    itensEquipados: [],
    pontosLivres: 0,
  }
}

function snapshotValido(): Record<string, unknown> {
  const batalhaDeTeste = batalha()
  const criado = criarSnapshot('viagem', personagem(), batalhaDeTeste)
  return JSON.parse(JSON.stringify(criado)) as Record<string, unknown>
}

// Acha o objeto no caminho informado e troca o valor da última chave, para o
// teste mexer no fundo do snapshot sem afetar os outros testes.
function em(caminho: string[], valor: unknown): Record<string, unknown> {
  const base = snapshotValido()
  let alvo: Record<string, unknown> = base
  for (const chave of caminho.slice(0, -1)) {
    alvo = alvo[chave] as Record<string, unknown>
  }
  const ultima = caminho[caminho.length - 1]
  if (ultima === undefined) throw new Error('caminho vazio')
  alvo[ultima] = valor
  return base
}

// Mesma troca, mas devolvendo só a unidade alterada, para os testes que
// validam uma unidade sozinha em vez do snapshot inteiro.
function unidadeHeroiCom(valor: unknown): Record<string, unknown> {
  return em(['unidadeHeroi'], valor).unidadeHeroi as Record<string, unknown>
}

describe('save válido', () => {
  it('aceita o snapshot que o próprio jogo grava', () => {
    const batalhaDeTeste = batalha()
    const texto = gravarSnapshot(criarSnapshot('viagem', personagem(), batalhaDeTeste))

    expect(lerSnapshot(texto)).not.toBeNull()
  })

  it('o round trip devolve a mesma batalha', () => {
    const batalhaDeTeste = batalha()
    const texto = gravarSnapshot(criarSnapshot('viagem', personagem(), batalhaDeTeste))
    const lido = lerSnapshot(texto)

    expect(lido?.unidadesInimigas).toHaveLength(2)
    expect(lido?.unidadeHeroi.id).toBe('heroi')
    expect(lido?.unidadesInimigas.map((unidade) => unidade.id)).toEqual([
      'grupo-a-0',
      'grupo-a-1',
    ])
  })
})

describe('save corrompido', () => {
  it('devolve null para string que não é JSON', () => {
    expect(lerSnapshot('isso não é json')).toBeNull()
  })

  it('devolve null para JSON que não é objeto', () => {
    expect(lerSnapshot('42')).toBeNull()
    expect(lerSnapshot('null')).toBeNull()
    expect(lerSnapshot('[]')).toBeNull()
  })

  it('devolve null para null e para string vazia', () => {
    expect(lerSnapshot(null)).toBeNull()
    expect(lerSnapshot('')).toBeNull()
  })

  it('recusa versão diferente da atual', () => {
    expect(lerSnapshot(JSON.stringify(em(['versao'], VERSAO_SAVE + 1)))).toBeNull()
  })

  it('recusa fase de missão que não existe', () => {
    expect(lerSnapshot(JSON.stringify(em(['faseMissao'], 'vitoria')))).toBeNull()
  })

  it('recusa payload maior que o limite', () => {
    const enorme = JSON.stringify(em(['personagem'], { nome: 'x'.repeat(TAMANHO_MAXIMO_SAVE) }))

    expect(enorme.length).toBeGreaterThan(TAMANHO_MAXIMO_SAVE)
    expect(lerSnapshot(enorme)).toBeNull()
  })
})

describe('save adulterado campo a campo', () => {
  it('recusa vida acima do máximo', () => {
    expect(ehSnapshotValido(em(['unidadeHeroi', 'vidaMaxima'], 10))).toBe(false)
  })

  it('recusa vida acima do máximo da própria unidade', () => {
    const alterado = em(['unidadeHeroi', 'vida'], 9_999_999)

    expect(ehSnapshotValido(alterado)).toBe(false)
  })

  it('recusa mana acima do máximo', () => {
    expect(ehSnapshotValido(em(['unidadeHeroi', 'manaMaxima'], 0))).toBe(false)
    expect(ehSnapshotValido(em(['unidadeHeroi', 'mana'], 500))).toBe(false)
  })

  it('recusa esquiva fora de 0 a 1', () => {
    expect(ehSnapshotValido(em(['unidadeHeroi', 'esquiva'], 2))).toBe(false)
    expect(ehSnapshotValido(em(['unidadeHeroi', 'esquiva'], -1))).toBe(false)
    expect(ehSnapshotValido(em(['unidadeHeroi', 'esquiva'], 'sempre'))).toBe(false)
  })

  it('recusa ataque com valor absurdo', () => {
    expect(ehSnapshotValido(em(['unidadeHeroi', 'ataqueFisico'], 10_000_000))).toBe(false)
  })

  it('recusa atributo negativo ou fracionário', () => {
    expect(ehSnapshotValido(em(['personagem', 'pontos', 'forca'], -1))).toBe(false)
    expect(ehSnapshotValido(em(['personagem', 'pontos', 'forca'], 1.5))).toBe(false)
  })

  it('recusa número que não é número finito', () => {
    expect(ehSnapshotValido(em(['unidadeHeroi', 'vida'], Number.POSITIVE_INFINITY))).toBe(false)
    expect(ehSnapshotValido(em(['unidadeHeroi', 'vida'], Number.NaN))).toBe(false)
  })

  it('recusa posição que não tem os dois números', () => {
    expect(ehSnapshotValido(em(['posHeroi', 'x'], '64'))).toBe(false)
    expect(ehSnapshotValido(em(['unidadeHeroi', 'pos'], { x: 1 }))).toBe(false)
  })

  it('recusa raca e classe inventadas', () => {
    expect(ehSnapshotValido(em(['personagem', 'raca'], 'draconico'))).toBe(false)
    expect(ehSnapshotValido(em(['personagem', 'classe'], 'paladino'))).toBe(false)
  })

  it('recusa tipo de ataque inventado', () => {
    expect(ehSnapshotValido(em(['unidadeHeroi', 'tipoAtaque'], 'magico'))).toBe(false)
  })

  it('recusa lista de inimigos grande demais', () => {
    const muitos = Array.from({ length: 40 }, (_, indice) => ({
      ...heroi(),
      id: `inimigo-${indice}`,
      ehHeroi: false,
    }))

    expect(ehSnapshotValido(em(['unidadesInimigas'], muitos))).toBe(false)
  })

  it('recusa dois ids iguais, que quebrariam a ordem dos turnos', () => {
    const base = snapshotValido()
    const inimigos = base.unidadesInimigas as Record<string, unknown>[]
    const primeiro = inimigos[0]
    if (primeiro === undefined) throw new Error('esperava inimigo')
    primeiro.id = 'grupo-a-1'

    expect(ehSnapshotValido(base)).toBe(false)
  })

  it('recusa herói marcado como inimigo', () => {
    const base = snapshotValido()
    const inimigos = base.unidadesInimigas as Record<string, unknown>[]
    const primeiro = inimigos[0]
    if (primeiro === undefined) throw new Error('esperava inimigo')
    primeiro.ehHeroi = true

    expect(ehSnapshotValido(base)).toBe(false)
  })

  it('recusa herói que não é herói', () => {
    expect(ehSnapshotValido(em(['unidadeHeroi', 'ehHeroi'], false))).toBe(false)
  })

  it('recusa campo faltando', () => {
    const base = snapshotValido()

    expect(ehSnapshotValido({ ...base, personagem: undefined })).toBe(false)
    expect(ehSnapshotValido({ ...base, unidadesInimigas: undefined })).toBe(false)
  })
})

describe('campo que o jogo não usa', () => {
  it('recusa campo a mais no snapshot', () => {
    expect(ehSnapshotValido({ ...snapshotValido(), hack: 'oi' })).toBe(false)
  })

  it('recusa campo a mais na unidade', () => {
    expect(ehUnidadeValida({ ...heroi(), hack: 'oi' })).toBe(false)
  })

  it('recusa campo a mais no personagem', () => {
    expect(ehSnapshotValido(em(['personagem'], { ...personagem(), hack: 'oi' }))).toBe(false)
  })

  it('recusa atributo de versão antiga no personagem', () => {
    const antigo = { ...personagem(), velocidade: 10 }

    expect(ehSnapshotValido(em(['personagem'], antigo))).toBe(false)
  })

  it('recusa snapshot completo com __proto__', () => {
    const texto = `{"__proto__":{"polluted":true},${JSON.stringify(snapshotValido()).slice(1)}`

    expect(lerSnapshot(texto)).toBeNull()
  })
})

describe('prototype pollution', () => {
  it('recusa payload com __proto__ no snapshot', () => {
    const payload = '{"versao":1,"__proto__":{"polluted":true}}'

    expect(lerSnapshot(payload)).toBeNull()
  })

  it('não suja o Object.prototype depois de ler payload ruim', () => {
    lerSnapshot('{"versao":1,"__proto__":{"polluted":true}}')

    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('não suja o Object.prototype com payload de array', () => {
    lerSnapshot('{"versao":1,"unidadesInimigas":[{"__proto__":{"x":1}}]}')

    expect(({} as Record<string, unknown>).x).toBeUndefined()
  })

  it('recusa objeto com prototype trocado', () => {
    const adulterado = Object.create({ kennedy: 'x' }) as Record<string, unknown>
    adulterado.versao = VERSAO_SAVE

    expect(ehSnapshotValido(adulterado)).toBe(false)
  })
})

describe('validação de unidade isolada', () => {
  it('recusa array no lugar de unidade', () => {
    expect(ehUnidadeValida([])).toBe(false)
  })

  it('recusa string no lugar de unidade', () => {
    expect(ehUnidadeValida('heroi')).toBe(false)
  })

  it('recusa booleanos trocados por número', () => {
    expect(ehUnidadeValida(unidadeHeroiCom({ ...heroi(), defendendo: 1 }))).toBe(false)
  })

  it('aceita unidade com vida zero, que é como o herói derrotado entra no save', () => {
    expect(ehUnidadeValida(unidadeHeroiCom({ ...heroi(), vida: 0 }))).toBe(true)
  })

  it('aceita o herói como o jogo cria, com todos os campos', () => {
    expect(ehUnidadeValida(heroi())).toBe(true)
  })

  it('recusa unidade com vida acima do máximo', () => {
    expect(ehUnidadeValida(unidadeHeroiCom({ ...heroi(), vida: 9_999 }))).toBe(false)
  })

  it('recusa esquiva fora de 0 a 1', () => {
    expect(ehUnidadeValida(unidadeHeroiCom({ ...heroi(), esquiva: 1.5 }))).toBe(false)
  })
})