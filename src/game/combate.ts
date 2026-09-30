import type { Sorteador } from './random'
import type {
  AcaoBatalha,
  Classe,
  Derivados,
  EstadoBatalha,
  Item,
  Unidade,
} from './tipos'

export const CUSTO_HABILIDADE = 8
export const VARIACAO_DANO = 0.2
export const PONTOS_POR_GOBLIN = 1

// O goblin não tem fórmula na spec, porque ele não é jogável. Estes números
// foram ajustados à mão para o herói vencer sozinho sem ser trivial.
export const GOBLIN = {
  vidaMaxima: 20,
  ataqueFisico: 7,
  velocidade: 6,
} as const

export type TipoAcaoBatalha = AcaoBatalha['tipo']

export type ResultadoAcao =
  | { ok: true; estado: EstadoBatalha }
  | { ok: false; motivo: string }

export function usaMana(classe: Classe): boolean {
  return classe === 'mago'
}

export function criarUnidadeHeroi(
  id: string,
  nome: string,
  classe: Classe,
  derivados: Derivados,
  pos: { x: number; y: number },
): Unidade {
  return {
    id,
    nome,
    pos,
    vida: derivados.vidaMaxima,
    vidaMaxima: derivados.vidaMaxima,
    mana: derivados.manaMaxima,
    manaMaxima: derivados.manaMaxima,
    velocidade: derivados.velocidade,
    ataqueFisico: derivados.ataqueFisico,
    ataqueDistancia: derivados.ataqueDistancia,
    danoMagico: derivados.danoMagico,
    tipoAtaque: classe === 'arqueiro' ? 'distancia' : 'fisico',
    defendendo: false,
    ehHeroi: true,
  }
}

export function criarUnidadesGoblin(
  grupoId: string,
  quantidade: number,
  posicoes: readonly { x: number; y: number }[],
): Unidade[] {
  return Array.from({ length: quantidade }, (_, indice) => {
    const pos = posicoes[indice] ?? { x: 0, y: 0 }
    return {
      id: `${grupoId}-${indice}`,
      nome: `Goblin ${indice + 1}`,
      pos,
      vida: GOBLIN.vidaMaxima,
      vidaMaxima: GOBLIN.vidaMaxima,
      mana: 0,
      manaMaxima: 0,
      velocidade: GOBLIN.velocidade,
      ataqueFisico: GOBLIN.ataqueFisico,
      ataqueDistancia: 0,
      danoMagico: 0,
      tipoAtaque: 'fisico' as const,
      defendendo: false,
      ehHeroi: false,
    }
  })
}

export function criarBatalha(
  heroi: Unidade,
  inimigos: readonly Unidade[],
): EstadoBatalha {
  const unidades = [heroi, ...inimigos]
  const ordem = [...unidades]
    .sort((a, b) => b.velocidade - a.velocidade || a.id.localeCompare(b.id))
    .map((unidade) => unidade.id)

  return { fase: 'ativa', unidades, ordem, indiceTurno: 0 }
}

export function unidadePorId(
  batalha: EstadoBatalha,
  id: string,
): Unidade | undefined {
  return batalha.unidades.find((unidade) => unidade.id === id)
}

export function unidadeAtual(batalha: EstadoBatalha): Unidade | undefined {
  const total = batalha.ordem.length
  for (let passo = 0; passo < total; passo += 1) {
    const indice = (batalha.indiceTurno + passo) % total
    const unidade = unidadePorId(batalha, batalha.ordem[indice] ?? '')
    if (unidade !== undefined && unidade.vida > 0) return unidade
  }
  return undefined
}

function proximoVivo(batalha: EstadoBatalha): number {
  const total = batalha.ordem.length
  for (let passo = 1; passo <= total; passo += 1) {
    const indice = (batalha.indiceTurno + passo) % total
    const unidade = unidadePorId(batalha, batalha.ordem[indice] ?? '')
    if (unidade !== undefined && unidade.vida > 0) return indice
  }
  return batalha.indiceTurno
}

// A defesa vale só para o turno em que foi usada, então ela é limpa no começo do
// próximo turno da própria unidade.
function avancarTurno(batalha: EstadoBatalha): EstadoBatalha {
  const indiceTurno = proximoVivo(batalha)
  const idDoTurno = batalha.ordem[indiceTurno] ?? ''
  return {
    ...batalha,
    indiceTurno,
    unidades: batalha.unidades.map((unidade) =>
      unidade.id === idDoTurno ? { ...unidade, defendendo: false } : unidade,
    ),
  }
}

export function calcularDano(base: number, rng: Sorteador): number {
  const variacao = 1 + (rng() * 2 - 1) * VARIACAO_DANO
  return Math.max(1, Math.round(base * variacao))
}

function ehAlvoValido(atacante: Readonly<Unidade>, alvo: Readonly<Unidade>): boolean {
  return alvo.ehHeroi !== atacante.ehHeroi && alvo.vida > 0
}

export function podeAgir(
  batalha: Readonly<EstadoBatalha>,
  unidade: Readonly<Unidade>,
  acao: AcaoBatalha,
): boolean {
  if (batalha.fase !== 'ativa' || unidade.vida <= 0) return false

  switch (acao.tipo) {
    case 'atacar':
    case 'habilidade': {
      const alvo = unidadePorId(batalha, acao.alvoId)
      if (alvo === undefined || !ehAlvoValido(unidade, alvo)) return false
      if (acao.tipo === 'habilidade') return unidade.mana >= CUSTO_HABILIDADE
      return true
    }
    case 'defender':
      return true
    case 'fugir':
      return (
        unidade.ehHeroi &&
        batalha.unidades.some((outra) => !outra.ehHeroi && outra.vida > 0)
      )
  }
}

export function acoesDisponiveis(
  batalha: Readonly<EstadoBatalha>,
  unidade: Readonly<Unidade>,
): TipoAcaoBatalha[] {
  const alvo = batalha.unidades.find((outra) => ehAlvoValido(unidade, outra))
  const disponiveis: TipoAcaoBatalha[] = []

  for (const tipo of ['defender', 'fugir'] as const) {
    if (podeAgir(batalha, unidade, { tipo })) disponiveis.push(tipo)
  }
  if (alvo === undefined) return disponiveis

  if (podeAgir(batalha, unidade, { tipo: 'atacar', alvoId: alvo.id })) {
    disponiveis.unshift('atacar')
  }
  if (podeAgir(batalha, unidade, { tipo: 'habilidade', alvoId: alvo.id })) {
    disponiveis.splice(1, 0, 'habilidade')
  }
  return disponiveis
}

function aplicarDano(
  batalha: Readonly<EstadoBatalha>,
  alvoId: string,
  dano: number,
): EstadoBatalha {
  const alvo = unidadePorId(batalha, alvoId)
  if (alvo === undefined) return batalha
  const danoAplicado = alvo.defendendo ? Math.max(1, Math.floor(dano / 2)) : dano
  return {
    ...batalha,
    unidades: batalha.unidades.map((unidade) =>
      unidade.id === alvoId
        ? { ...unidade, vida: Math.max(0, unidade.vida - danoAplicado) }
        : unidade,
    ),
  }
}

function resolverFase(batalha: EstadoBatalha): EstadoBatalha {
  const heroi = batalha.unidades.find((unidade) => unidade.ehHeroi)
  const inimigoVivo = batalha.unidades.some(
    (unidade) => !unidade.ehHeroi && unidade.vida > 0,
  )

  let fase = batalha.fase
  if (heroi !== undefined && heroi.vida <= 0) fase = 'derrota'
  else if (!inimigoVivo) fase = 'vitoria'
  return fase === batalha.fase ? batalha : { ...batalha, fase }
}

export function aplicarAcao(
  batalha: Readonly<EstadoBatalha>,
  acao: AcaoBatalha,
  rng: Sorteador,
): ResultadoAcao {
  const unidade = unidadeAtual(batalha)
  if (unidade === undefined) {
    return { ok: false, motivo: 'Não há unidade viva em campo.' }
  }
  if (!podeAgir(batalha, unidade, acao)) {
    return { ok: false, motivo: 'Ação indisponível neste turno.' }
  }

  let estado = batalha

  switch (acao.tipo) {
    case 'fugir': {
      return { ok: true, estado: { ...estado, fase: 'fuga' } }
    }
    case 'defender': {
      estado = {
        ...estado,
        unidades: estado.unidades.map((outra) =>
          outra.id === unidade.id ? { ...outra, defendendo: true } : outra,
        ),
      }
      break
    }
    case 'atacar': {
      const alvo = unidadePorId(batalha, acao.alvoId)
      if (alvo === undefined) {
        return { ok: false, motivo: 'Alvo não encontrado.' }
      }
      const base =
        unidade.tipoAtaque === 'distancia' ? unidade.ataqueDistancia : unidade.ataqueFisico
      estado = aplicarDano(estado, alvo.id, calcularDano(base, rng))
      break
    }
    case 'habilidade': {
      const alvo = unidadePorId(batalha, acao.alvoId)
      if (alvo === undefined) {
        return { ok: false, motivo: 'Alvo não encontrado.' }
      }
      const custo = Math.min(unidade.mana, CUSTO_HABILIDADE)
      estado = {
        ...estado,
        unidades: estado.unidades.map((outra) =>
          outra.id === unidade.id ? { ...outra, mana: outra.mana - custo } : outra,
        ),
      }
      estado = aplicarDano(estado, alvo.id, calcularDano(unidade.danoMagico, rng))
      break
    }
  }

  estado = resolverFase(estado)
  if (estado.fase !== 'ativa') return { ok: true, estado }

  return { ok: true, estado: avancarTurno(estado) }
}

export interface Recompensa {
  itens: Item[]
  pontosAtributo: number
}

export function goblinsDerrotados(batalha: Readonly<EstadoBatalha>): number {
  return batalha.unidades.filter((unidade) => !unidade.ehHeroi && unidade.vida <= 0).length
}

export function recompensaVitoria(
  batalha: Readonly<EstadoBatalha>,
  sorteiaDrop: () => Item | null,
): Recompensa {
  const derrotados = goblinsDerrotados(batalha)
  const drops: Item[] = []
  for (let i = 0; i < derrotados; i += 1) {
    const item = sorteiaDrop()
    if (item !== null) drops.push(item)
  }
  return { itens: drops, pontosAtributo: derrotados * PONTOS_POR_GOBLIN }
}