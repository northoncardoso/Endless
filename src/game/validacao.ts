import type {
  FaseMissao,
  Personagem,
  PontosAtributo,
  Posicao,
  Raca,
  Classe,
  TipoAtaque,
  Unidade,
} from './tipos'
import type { SnapshotBatalha } from './save'

// Versão do formato do save. O validador é o dono do número, porque é ele que
// decide o que aceita, e `save.ts` importa daqui para escrever. O caminho
// inverso seria ciclo em tempo de execução, já que o validador precisa do tipo
// do snapshot que `save.ts` define.
export const VERSAO_SAVE = 2

// Validação do save, o único dado que entra no jogo vindo de fora.
//
// O que vale aqui não é "o save é válido", e sim "o save é seguro de usar". Por
// isso cada campo usado pela batalha é checado com tipo e faixa, e a checagem
// para no primeiro campo ruim, devolvendo false em vez de tentar consertar.
//
// Sem biblioteca de schema de propósito: o snapshot tem seis campos e uma
// lista, e uma dependência seria maior que o código que ela substitui.

// Objetos com prototype alterado vêm de payload que usou `__proto__` na chave.
// `JSON.parse` não executa prototype pollution, mas um save não deve passar
// mesmo assim, porque o resto do jogo trata tudo como objeto simples.
export function ehObjetoLimpo(valor: unknown): valor is Record<string, unknown> {
  if (typeof valor !== 'object' || valor === null) return false
  if (Array.isArray(valor)) return false
  const proto = Object.getPrototypeOf(valor) as object | null
  return proto === Object.prototype || proto === null
}

export function ehNumeroFinito(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor)
}

// Allowlist de chaves. Conferir só o que é usado deixaria passar save de
// versão antiga, que carrega o atributo `velocidade` que hoje virou
// `velocidadeMovimento`. O jogo ignora campo sobrando, e campo ignorado é
// dado que ninguém revisou.
function temSoChaves(valor: Record<string, unknown>, chaves: readonly string[]): boolean {
  return Object.keys(valor).every((chave) => chaves.includes(chave))
}

// É type guard de propósito: sem narrowing, comparar `vida` com `vidaMaxima`
// depois da checagem vira `unknown` e o TypeScript reclama.
export function ehInteiroNoIntervalo(
  valor: unknown,
  minimo: number,
  maximo: number,
): valor is number {
  return ehNumeroFinito(valor) && Number.isInteger(valor) && valor >= minimo && valor <= maximo
}

export function ehProbabilidade(valor: unknown): valor is number {
  return ehNumeroFinito(valor) && valor >= 0 && valor <= 1
}

export function ehTexto(valor: unknown, tamanhoMaximo: number): valor is string {
  return typeof valor === 'string' && valor.length > 0 && valor.length <= tamanhoMaximo
}

const RACAS: readonly Raca[] = ['humano', 'elfo', 'anao']
const CLASSES: readonly Classe[] = ['cavaleiro', 'arqueiro', 'mago']
const TIPOS_ATAQUE: readonly TipoAtaque[] = ['fisico', 'distancia']

const FASES: readonly FaseMissao[] = [
  'criacao',
  'caravana',
  'viagem',
  'batalha',
  'retorno',
  'cidade',
  'continuar',
]

export const LIMITE_VIDA = 10_000
export const LIMITE_ATAQUE = 1_000
export const LIMITE_PONTOS = 1_000
export const LIMITE_ITENS_EQUIPADOS = 24
export const LIMITE_INIMIGOS = 32

function ehLista(valor: unknown, limite: number): valor is unknown[] {
  return Array.isArray(valor) && valor.length <= limite
}

function ehPosicao(valor: unknown): valor is Posicao {
  if (!ehObjetoLimpo(valor)) return false
  if (!temSoChaves(valor, ['x', 'y'])) return false
  return ehNumeroFinito(valor.x) && ehNumeroFinito(valor.y)
}

function ehPontos(valor: unknown): valor is PontosAtributo {
  if (!ehObjetoLimpo(valor)) return false
  if (!temSoChaves(valor, ['forca', 'agilidade', 'inteligencia'])) return false
  return (
    ehInteiroNoIntervalo(valor.forca, 0, LIMITE_PONTOS) &&
    ehInteiroNoIntervalo(valor.agilidade, 0, LIMITE_PONTOS) &&
    ehInteiroNoIntervalo(valor.inteligencia, 0, LIMITE_PONTOS)
  )
}

function ehPersonagem(valor: unknown): valor is Personagem {
  if (!ehObjetoLimpo(valor)) return false
  if (!temSoChaves(valor, ['nome', 'raca', 'classe', 'pontos', 'itensEquipados', 'pontosLivres'])) {
    return false
  }
  if (!ehTexto(valor.nome, 40)) return false
  if (!RACAS.includes(valor.raca as Raca)) return false
  if (!CLASSES.includes(valor.classe as Classe)) return false
  if (!ehPontos(valor.pontos)) return false
  if (!ehInteiroNoIntervalo(valor.pontosLivres, 0, LIMITE_PONTOS)) return false
  if (!ehLista(valor.itensEquipados, LIMITE_ITENS_EQUIPADOS)) return false
  return valor.itensEquipados.every((id) => ehTexto(id, 40))
}

const CHAVES_UNIDADE = [
  'id',
  'nome',
  'pos',
  'vida',
  'vidaMaxima',
  'mana',
  'manaMaxima',
  'ataqueFisico',
  'ataqueDistancia',
  'danoMagico',
  'tipoAtaque',
  'defendendo',
  'esquiva',
  'ehHeroi',
] as const

export function ehUnidadeValida(valor: unknown): valor is Unidade {
  if (!ehObjetoLimpo(valor)) return false
  if (!temSoChaves(valor, CHAVES_UNIDADE)) return false
  if (!ehTexto(valor.id, 40)) return false
  if (!ehTexto(valor.nome, 40)) return false
  if (!ehPosicao(valor.pos)) return false
  if (!ehInteiroNoIntervalo(valor.vida, 0, LIMITE_VIDA)) return false
  if (!ehInteiroNoIntervalo(valor.vidaMaxima, 1, LIMITE_VIDA)) return false
  if (!ehInteiroNoIntervalo(valor.mana, 0, LIMITE_VIDA)) return false
  if (!ehInteiroNoIntervalo(valor.manaMaxima, 0, LIMITE_VIDA)) return false
  if (!ehInteiroNoIntervalo(valor.ataqueFisico, 0, LIMITE_ATAQUE)) return false
  if (!ehInteiroNoIntervalo(valor.ataqueDistancia, 0, LIMITE_ATAQUE)) return false
  if (!ehInteiroNoIntervalo(valor.danoMagico, 0, LIMITE_ATAQUE)) return false
  if (!TIPOS_ATAQUE.includes(valor.tipoAtaque as TipoAtaque)) return false
  if (typeof valor.defendendo !== 'boolean') return false
  if (!ehProbabilidade(valor.esquiva)) return false
  if (typeof valor.ehHeroi !== 'boolean') return false
  // Vida acima do máximo é o jeito mais direto de um save adulterado dar cura
  // infinita, então é recusado aqui em vez de ser corrigido depois.
  return valor.vida <= valor.vidaMaxima && valor.mana <= valor.manaMaxima
}

export function ehSnapshotValido(valor: unknown): valor is SnapshotBatalha {
  if (!ehObjetoLimpo(valor)) return false
  if (
    !temSoChaves(valor, [
      'versao',
      'faseMissao',
      'personagem',
      'unidadeHeroi',
      'unidadesInimigas',
      'posHeroi',
    ])
  ) {
    return false
  }
  if (valor.versao !== VERSAO_SAVE) return false
  if (!FASES.includes(valor.faseMissao as FaseMissao)) return false
  if (!ehPersonagem(valor.personagem)) return false
  if (!ehUnidadeValida(valor.unidadeHeroi)) return false
  if (!ehLista(valor.unidadesInimigas, LIMITE_INIMIGOS)) return false
  if (!valor.unidadesInimigas.every(ehUnidadeValida)) return false
  if (!ehPosicao(valor.posHeroi)) return false

  // Um snapshot com herói marcado como inimigo, ou dois heróis, quebra a regra
  // de lado da batalha. Checar aqui é mais barato do que explicar o bug depois.
  if (valor.unidadeHeroi.ehHeroi !== true) return false
  if (valor.unidadesInimigas.some((unidade) => unidade.ehHeroi)) return false

  const ids = [valor.unidadeHeroi.id, ...valor.unidadesInimigas.map((unidade) => unidade.id)]
  return new Set(ids).size === ids.length
}