import type { Sorteador } from './random'
import type {
  AcaoBatalha,
  Classe,
  Consumivel,
  Derivados,
  Direcao,
  EstadoBatalha,
  ItemDaBag,
  Posicao,
  Unidade,
} from './tipos'

export const CUSTO_HABILIDADE = 8
export const VARIACAO_DANO = 0.2
export const PONTOS_POR_GOBLIN = 1

// Defender dá metade do dano e ainda uma chance de não tomar o golpe. O buff
// dura só até o próximo turno da unidade, porque senão uma unidade que se
// defende sempre nunca mais levaria dano.
export const REDUCAO_DEFESA = 0.5
export const CHANCE_ESQUIVA = 0.25

// O goblin não tem fórmula na spec, porque ele não é jogável. Estes números
// foram ajustados à mão para o herói vencer sozinho sem ser trivial.
export const GOBLIN = {
  vidaMaxima: 20,
  ataqueFisico: 7,
} as const

export type TipoAcaoBatalha = AcaoBatalha['tipo']

// A mensagem é o que a tela mostra depois do turno. A regra não escreve texto de
// HUD, ela devolve o que aconteceu, e quem desenha formata.
export type ResultadoAcao =
  | { ok: true; estado: EstadoBatalha; mensagem: string }
  | { ok: false; motivo: string }

// Consumíveis disponíveis na bag. A batalha não vê a bag, ela recebe só a lista
// do que pode usar, e quem chama monta essa lista do estado do jogo.
export interface ItensUsaveis {
  consumiveis: readonly Consumivel[]
}

// A recompensa pode ser equipamento ou comida, porque o drop do goblin sorteia
// entre os dois catálogos. O item fica no chão com o id da unidade que deixou,
// e quem pega é o jogador com a tecla E.
export interface ItemDeLoot {
  unidadeId: string
  pos: Posicao
  item: ItemDaBag
}

export interface Recompensa {
  loot: ItemDeLoot[]
  pontosAtributo: number
}

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
    ataqueFisico: derivados.ataqueFisico,
    ataqueDistancia: derivados.ataqueDistancia,
    danoMagico: derivados.danoMagico,
    tipoAtaque: classe === 'arqueiro' ? 'distancia' : 'fisico',
    defendendo: false,
    esquiva: 0,
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
      ataqueFisico: GOBLIN.ataqueFisico,
      ataqueDistancia: 0,
      danoMagico: 0,
      tipoAtaque: 'fisico' as const,
      defendendo: false,
      esquiva: 0,
      ehHeroi: false,
    }
  })
}

// Lado fixo: o herói age primeiro, depois os inimigos na ordem em que entraram.
// Não entra velocidade aqui, porque a ordem do protótipo é previsível de
// propósito. A velocidade virou movimento no mapa, em atributos.ts.
export function criarBatalha(
  heroi: Unidade,
  inimigos: readonly Unidade[],
): EstadoBatalha {
  const unidades = [heroi, ...inimigos]

  return { fase: 'ativa', unidades, ordem: unidades.map((unidade) => unidade.id), indiceTurno: 0 }
}

// Índice de quem age agora, pulando unidade morta. Devolve `ordem.length` quando
// todo mundo morreu, e quem chama trata isso como fim de batalha.
function indiceDoTurno(batalha: EstadoBatalha): number {
  const total = batalha.ordem.length
  for (let passo = 0; passo < total; passo += 1) {
    const indice = (batalha.indiceTurno + passo) % total
    const unidade = unidadePorId(batalha, batalha.ordem[indice] ?? '')
    if (unidade !== undefined && unidade.vida > 0) return indice
  }
  return total
}

export function unidadePorId(
  batalha: EstadoBatalha,
  id: string,
): Unidade | undefined {
  return batalha.unidades.find((unidade) => unidade.id === id)
}

export function unidadeAtual(batalha: EstadoBatalha): Unidade | undefined {
  const indice = indiceDoTurno(batalha)
  if (indice >= batalha.ordem.length) return undefined
  return unidadePorId(batalha, batalha.ordem[indice] ?? '')
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

// A defesa e a esquiva valem só até o próximo turno da própria unidade, então
// as duas são limpas no começo desse turno. Quem não se defendeu não muda nada.
function avancarTurno(batalha: EstadoBatalha): EstadoBatalha {
  const indiceTurno = proximoVivo(batalha)
  const idDoTurno = batalha.ordem[indiceTurno] ?? ''
  return {
    ...batalha,
    indiceTurno,
    unidades: batalha.unidades.map((unidade) =>
      unidade.id === idDoTurno
        ? { ...unidade, defendendo: false, esquiva: 0 }
        : unidade,
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
  itens: Readonly<ItensUsaveis> = { consumiveis: [] },
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
    case 'usarItem': {
      const alvo = unidadePorId(batalha, acao.alvoId)
      // Item cura aliado, então o alvo tem que ser do mesmo lado e não pode ser
      // quem já está com a vida cheia, senão o turno seria jogado fora.
      if (alvo === undefined) return false
      if (alvo.ehHeroi !== unidade.ehHeroi || alvo.vida <= 0) return false
      if (alvo.vida >= alvo.vidaMaxima) return false
      return itens.consumiveis.some((item) => item.id === acao.itemId)
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
  itens: Readonly<ItensUsaveis> = { consumiveis: [] },
): TipoAcaoBatalha[] {
  const alvo = batalha.unidades.find((outra) => ehAlvoValido(unidade, outra))
  const disponiveis: TipoAcaoBatalha[] = []

  for (const tipo of ['defender', 'fugir'] as const) {
    if (podeAgir(batalha, unidade, { tipo }, itens)) disponiveis.push(tipo)
  }
  if (alvo === undefined) return disponiveis

  if (podeAgir(batalha, unidade, { tipo: 'atacar', alvoId: alvo.id }, itens)) {
    disponiveis.unshift('atacar')
  }
  if (podeAgir(batalha, unidade, { tipo: 'habilidade', alvoId: alvo.id }, itens)) {
    disponiveis.splice(1, 0, 'habilidade')
  }
  const aliado = batalha.unidades.find(
    (outra) => outra.ehHeroi === unidade.ehHeroi && outra.vida > 0 && outra.vida < outra.vidaMaxima,
  )
  const consumivel = itens.consumiveis[0]
  if (aliado !== undefined && consumivel !== undefined) {
    disponiveis.splice(1, 0, 'usarItem')
  }
  return disponiveis
}

// Lista de alvos válidos para a ação escolhida. A UI percorre essa lista com as
// setas, então a ordem dela é a ordem em que o jogador vê o alvo girar.
export function alvosPara(
  batalha: Readonly<EstadoBatalha>,
  unidade: Readonly<Unidade>,
  acao: AcaoBatalha,
  itens: Readonly<ItensUsaveis> = { consumiveis: [] },
): Unidade[] {
  return batalha.unidades.filter((outra) => {
    if (acao.tipo === 'defender' || acao.tipo === 'fugir') return false
    const alvo = unidadePorId(batalha, outra.id)
    return (
      alvo !== undefined &&
      podeAgir(batalha, unidade, { ...acao, alvoId: outra.id } as AcaoBatalha, itens)
    )
  })
}

// Move o alvo selecionado um passo na direção pedida e devolve o novo índice.
// As setas da batalha usam isso, e o círculo no chão é desenhado no id que
// volta daqui.
// A seleção de alvo é simples de propósito: com poucos inimigos na tela, o
// jogador precisa de uma regra que ele entenda sem tutorial. Percorre a lista na
// direção pedida e volta ao começo, então segurar a seta sempre move o círculo.
export function proximoAlvo(
  alvos: readonly Unidade[],
  selecionadoId: string | null,
  direcao: Direcao,
): string | null {
  if (alvos.length === 0) return null
  const atual = alvos.findIndex((unidade) => unidade.id === selecionadoId)
  if (atual === -1) return alvos[0]?.id ?? null

  const passo = direcao === 'direita' || direcao === 'baixo' ? 1 : -1
  const proximo = (atual + passo + alvos.length) % alvos.length
  return alvos[proximo]?.id ?? null
}

type DanoAplicado =
  | { estado: EstadoBatalha; esquivou: false; dano: number }
  | { estado: EstadoBatalha; esquivou: true; dano: 0 }

// Defender faz duas coisas: corta o dano pela metade e ainda dá chance de
// esquivar do golpe. A esquiva é sorteada aqui, com o mesmo gerador do resto da
// batalha, para o teste poder prová-la com semente.
function aplicarDano(
  batalha: EstadoBatalha,
  alvoId: string,
  dano: number,
  rng: Sorteador,
): DanoAplicado {
  const alvo = unidadePorId(batalha, alvoId)
  if (alvo === undefined) return { estado: batalha, esquivou: false, dano: 0 }

  if (alvo.esquiva > 0 && rng() < alvo.esquiva) {
    return { estado: batalha, esquivou: true, dano: 0 }
  }

  const danoAplicado = alvo.defendendo
    ? Math.max(1, Math.floor(dano * (1 - REDUCAO_DEFESA)))
    : dano

  return {
    esquivou: false,
    dano: danoAplicado,
    estado: {
      ...batalha,
      unidades: batalha.unidades.map((unidade) =>
        unidade.id === alvoId
          ? { ...unidade, vida: Math.max(0, unidade.vida - danoAplicado) }
          : unidade,
      ),
    },
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
  itens: Readonly<ItensUsaveis> = { consumiveis: [] },
): ResultadoAcao {
  const unidade = unidadeAtual(batalha)
  if (unidade === undefined) {
    return { ok: false, motivo: 'Não há unidade viva em campo.' }
  }
  if (!podeAgir(batalha, unidade, acao, itens)) {
    return { ok: false, motivo: 'Ação indisponível neste turno.' }
  }

  const nomeUnidade = unidade.nome
  let estado = batalha

  switch (acao.tipo) {
    case 'fugir': {
      return { ok: true, estado: { ...estado, fase: 'fuga' }, mensagem: 'Você fugiu.' }
    }

    case 'defender': {
      estado = {
        ...estado,
        unidades: estado.unidades.map((outra) =>
          outra.id === unidade.id
            ? { ...outra, defendendo: true, esquiva: CHANCE_ESQUIVA }
            : outra,
        ),
      }
      return concluir(estado, `${nomeUnidade} se defendeu.`)
    }

    case 'usarItem': {
      const consumivel = itens.consumiveis.find((item) => item.id === acao.itemId)
      const alvo = unidadePorId(batalha, acao.alvoId)
      if (consumivel === undefined || alvo === undefined) {
        return { ok: false, motivo: 'Item indisponível.' }
      }
      estado = {
        ...estado,
        unidades: estado.unidades.map((outra) =>
          outra.id === alvo.id
            ? { ...outra, vida: Math.min(outra.vidaMaxima, outra.vida + consumivel.cura) }
            : outra,
        ),
      }
      return concluir(
        estado,
        `${nomeUnidade} usou ${consumivel.nome} e recuperou ${consumivel.cura} de vida.`,
      )
    }

    case 'atacar':
    case 'habilidade': {
      const alvo = unidadePorId(batalha, acao.alvoId)
      if (alvo === undefined) {
        return { ok: false, motivo: 'Alvo não encontrado.' }
      }

      let nomeAcao = 'atacou'
      if (acao.tipo === 'habilidade') {
        nomeAcao = 'usou a habilidade em'
        const custo = Math.min(unidade.mana, CUSTO_HABILIDADE)
        estado = {
          ...estado,
          unidades: estado.unidades.map((outra) =>
            outra.id === unidade.id ? { ...outra, mana: outra.mana - custo } : outra,
          ),
        }
      }

      const base =
        acao.tipo === 'habilidade'
          ? unidade.danoMagico
          : unidade.tipoAtaque === 'distancia'
            ? unidade.ataqueDistancia
            : unidade.ataqueFisico

      const resultado = aplicarDano(estado, alvo.id, calcularDano(base, rng), rng)
      estado = resultado.estado

      if (resultado.esquivou) {
        return concluir(estado, `${alvo.nome} esquivou do golpe.`)
      }
      return concluir(
        estado,
        `${nomeUnidade} ${nomeAcao} ${alvo.nome} e causou ${resultado.dano} de dano.`,
      )
    }
  }
}

// Toda ação válida passa por aqui, então o fim de batalha e o avanço de turno
// acontecem em um lugar só. Sem isso, cada caso repetiria a mesma regra.
function concluir(estado: EstadoBatalha, mensagem: string): ResultadoAcao {
  const resolvida = resolverFase(estado)
  if (resolvida.fase !== 'ativa') return { ok: true, estado: resolvida, mensagem }
  return { ok: true, estado: avancarTurno(resolvida), mensagem }
}

export function goblinsDerrotados(batalha: Readonly<EstadoBatalha>): number {
  return batalha.unidades.filter((unidade) => !unidade.ehHeroi && unidade.vida <= 0).length
}

export function recompensaVitoria(
  batalha: Readonly<EstadoBatalha>,
  sorteiaDrop: () => ItemDaBag | null,
): Recompensa {
  const loot: ItemDeLoot[] = []
  for (const unidade of batalha.unidades) {
    if (unidade.ehHeroi || unidade.vida > 0) continue
    const item = sorteiaDrop()
    if (item !== null) loot.push({ unidadeId: unidade.id, pos: unidade.pos, item })
  }
  // Ponto é por goblin abatido, não por drop. Se oGoblin não deixou nada, o
  // jogador ainda ganhou a recompensa dele.
  return { loot, pontosAtributo: goblinsDerrotados(batalha) * PONTOS_POR_GOBLIN }
}