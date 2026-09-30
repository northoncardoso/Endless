import { bonusDe, comPonto, derivados, PONTOS_INICIAIS } from './atributos'
import {
  acoesDisponiveis,
  aplicarAcao,
  criarBatalha,
  criarUnidadeHeroi,
  criarUnidadesGoblin,
  recompensaVitoria,
  type ItensUsaveis,
} from './combate'
import { dialogoDe } from './dialogos'
import { CATALOGO_ITENS, buscarItem, sortearDropDeGoblin } from './itens'
import { FASE_INICIAL, avancarFase } from './missoes'
import {
  adicionarLoot,
  alvoInteracao,
  criarMundo,
  dispersarGrupo,
  grupoEmAlcance,
  moverHeroi,
  moverHeroiFluido,
  pegarLote,
  vagarGoblins,
  velocidadeDoHeroi,
} from './mundo'
import type { Sorteador } from './random'
import {
  batalhaDoSnapshot,
  criarArmazenamentoMemoria,
  criarSnapshot,
  gravarSnapshot,
  lerSnapshot,
  type Armazenamento,
  type SnapshotBatalha,
} from './save'
import {
  ehConsumivel,
  type AcaoBatalha,
  type Classe,
  type Consumivel,
  type Direcao,
  type EstadoBatalha,
  type FaseMissao,
  type Item,
  type ItemDaBag,
  type Mundo,
  type Personagem,
  type PontosAtributo,
  type Posicao,
  type Raca,
  type Unidade,
} from './tipos'

export const CHAVE_SAVE = 'endless:batalha'
export const POSICAO_HEROI_BATALHA: Readonly<Posicao> = { x: 64, y: 96 }

export interface EstadoJogo {
  fase: FaseMissao
  personagem: Personagem | null
  bag: ItemDaBag[]
  mundo: Mundo
  batalha: EstadoBatalha | null
  snapshot: SnapshotBatalha | null
  pontosPendente: number
  aviso: string | null
  // O diálogo em andamento. `null` é o estado normal, e um número é a página
  // que está na tela.
  dialogo: { rota: string; pagina: number } | null
}

export type AcaoJogo =
  | { tipo: 'criarPersonagem'; nome: string; raca: Raca; classe: Classe }
  | { tipo: 'distribuirPonto'; atributo: keyof PontosAtributo }
  | { tipo: 'avancarMissao' }
  | { tipo: 'mover'; direcao: Direcao }
  | { tipo: 'moverFluido'; direcao: Direcao | null; dt: number }
  | { tipo: 'passarTempo' }
  | { tipo: 'interagir' }
  | { tipo: 'avancarDialogo' }
  | { tipo: 'fecharDialogo' }
  | { tipo: 'iniciarBatalha'; grupoId: string; posInimigos: readonly Posicao[] }
  | { tipo: 'agir'; acao: AcaoBatalha }
  | { tipo: 'reiniciarBatalha' }
  | { tipo: 'abandonarBatalha' }
  | { tipo: 'equipar'; itemId: string }
  | { tipo: 'desequipar'; itemId: string }
  | { tipo: 'gastarPonto'; atributo: keyof PontosAtributo }

export interface Dependencias {
  rng: Sorteador
  armazenamento: Armazenamento
}

export const ESTADO_INICIAL: EstadoJogo = {
  fase: FASE_INICIAL,
  personagem: null,
  bag: [],
  mundo: criarMundo(),
  batalha: null,
  snapshot: null,
  pontosPendente: 0,
  aviso: null,
  dialogo: null,
}

function novoPersonagem(nome: string, raca: Raca, classe: Classe): Personagem {
  return {
    nome,
    raca,
    classe,
    pontos: { forca: 0, agilidade: 0, inteligencia: 0 },
    itensEquipados: [],
    pontosLivres: PONTOS_INICIAIS,
  }
}

function comAviso(estado: EstadoJogo, aviso: string | null): EstadoJogo {
  return { ...estado, aviso }
}

function fecharBatalha(estado: EstadoJogo, fase: FaseMissao): EstadoJogo {
  return {
    ...estado,
    fase,
    batalha: null,
    snapshot: null,
  }
}

// A tela de fim de batalha mostra o que o jogador ganhou, então o texto mora
// aqui, junto de quem decide o que foi ganho.
function textoDeVitoria(pontos: number, lotes: number): string {
  const pontosTexto = pontos === 1 ? '1 ponto de atributo' : `${pontos} pontos de atributo`
  const lootTexto =
    lotes === 0 ? '' : lotes === 1 ? ' Um item ficou no chão.' : ` ${lotes} itens ficaram no chão.`
  return `Você venceu! Ganhou ${pontosTexto}.${lootTexto}`
}

// A batalha não vê a bag, ela recebe só a lista do que pode usar agora. Quem
// monta essa lista é o estado, porque quem tem a bag é o estado.
function itensUsaveis(estado: Readonly<EstadoJogo>): ItensUsaveis {
  const consumiveis: Consumivel[] = []
  for (const item of estado.bag) {
    if (!ehConsumivel(item)) continue
    consumiveis.push({ id: item.id, nome: item.nome, cura: item.cura })
  }
  return { consumiveis }
}

// Todo consumível guardado na bag vale na batalha, duplicata vale em cópia. A
// lista vem do estado porque a bag é dele, e a batalha só recebe a lista pronta.
export function consumiveisDaBag(estado: Readonly<EstadoJogo>): readonly Consumivel[] {
  return itensUsaveis(estado).consumiveis
}

// Tira uma unidade só do consumível usado. Duas poções na bag são duas poções, e
// usar uma tem que deixar a outra lá.
function consumirItem(bag: readonly ItemDaBag[], itemId: string): ItemDaBag[] {
  const restante = [...bag]
  const indice = restante.findIndex((item) => item.id === itemId)
  if (indice >= 0) restante.splice(indice, 1)
  return restante
}

// Quem joga agora. A batalha nunca fica parada num morto, então procurar o id da
// ordem na posição atual é seguro mesmo depois de um ataque fatal.
function unidadeAtual(batalha: Readonly<EstadoBatalha>): Unidade | undefined {
  const id = batalha.ordem[batalha.indiceTurno]
  return batalha.unidades.find((unidade) => unidade.id === id && unidade.vida > 0)
}

// Ações que a caixa de opções mostra no turno atual. A UI chama isso em vez de
// repetir a regra, para a caixa e a batalha nunca discordarem.
export function acoesDoTurno(estado: Readonly<EstadoJogo>): AcaoBatalha['tipo'][] {
  const batalha = estado.batalha
  if (batalha === null) return []
  const unidade = unidadeAtual(batalha)
  if (unidade === undefined) return []
  return acoesDisponiveis(batalha, unidade, itensUsaveis(estado))
}

// Quando o herói chega perto de um grupo de goblin, a batalha começa. O mesmo
// gatilho vale para passo discreto e para movimento contínuo, então a regra
// fica num lugar só.
function avancaMundo(estado: EstadoJogo, mundo: Mundo, deps: Dependencias): EstadoJogo {
  if (mundo === estado.mundo) return comAviso(estado, null)

  const grupo = grupoEmAlcance(mundo)
  if (grupo !== null && estado.fase !== 'cidade') {
    return comAviso(
      reducer(
        { ...estado, mundo },
        { tipo: 'iniciarBatalha', grupoId: grupo.grupoId, posInimigos: grupo.posInimigos },
        deps,
      ),
      null,
    )
  }

  return comAviso({ ...estado, mundo }, null)
}

function reduzirBatalha(
  estado: EstadoJogo,
  acao: AcaoBatalha,
  deps: Dependencias,
): EstadoJogo {
  const batalha = estado.batalha
  const personagem = estado.personagem
  if (batalha === null || personagem === null) {
    return comAviso(estado, 'Não há batalha em andamento.')
  }

  const resultado = aplicarAcao(batalha, acao, deps.rng, itensUsaveis(estado))
  if (!resultado.ok) return comAviso(estado, resultado.motivo)

  const proxima = resultado.estado
  // O consumível sai da bag assim que é usado, e não só quando a batalha acaba.
  // Item de atributo não é usado, então continua lá.
  const bagUsando =
    acao.tipo === 'usarItem' ? consumirItem(estado.bag, acao.itemId) : estado.bag

  if (proxima.fase === 'derrota') {
    return comAviso({ ...estado, batalha: proxima, bag: bagUsando }, resultado.mensagem)
  }

  if (proxima.fase === 'vitoria' || proxima.fase === 'fuga') {
    const recompensa = proxima.fase === 'vitoria'
      ? recompensaVitoria(proxima, () => sortearDropDeGoblin(deps.rng))
      : { loot: [], pontosAtributo: 0 }

    const comLoot = recompensa.loot.reduce<Mundo>(
      (mundo, item) => adicionarLoot(mundo, item.unidadeId, item.pos, item.item),
      estado.mundo,
    )

    const idsDoGrupo = proxima.unidades
      .filter((unidade) => !unidade.ehHeroi)
      .map((unidade) => unidade.id)
    const mundo = proxima.fase === 'fuga' ? dispersarGrupo(comLoot, idsDoGrupo) : comLoot

    return comAviso(
      {
        ...fecharBatalha(estado, 'retorno'),
        mundo,
        bag: bagUsando,
        pontosPendente: estado.pontosPendente + recompensa.pontosAtributo,
      },
      proxima.fase === 'fuga'
        ? 'Você fugiu da batalha.'
        : textoDeVitoria(recompensa.pontosAtributo, recompensa.loot.length),
    )
  }

  return comAviso({ ...estado, batalha: proxima, bag: bagUsando }, resultado.mensagem)
}

export function reducer(
  estado: EstadoJogo,
  acao: AcaoJogo,
  deps: Dependencias = {
    rng: Math.random,
    armazenamento: criarArmazenamentoMemoria(),
  },
): EstadoJogo {
  switch (acao.tipo) {
    case 'criarPersonagem': {
      const personagem = novoPersonagem(acao.nome, acao.raca, acao.classe)
      return comAviso({ ...ESTADO_INICIAL, personagem }, null)
    }

    case 'distribuirPonto': {
      const personagem = estado.personagem
      if (personagem === null) return comAviso(estado, 'Sem personagem.')
      if (estado.fase !== 'criacao') {
        return comAviso(estado, 'Os pontos só se distribuem na criação.')
      }
      if (personagem.pontosLivres <= 0) {
        return comAviso(estado, `Os ${PONTOS_INICIAIS} pontos já foram distribuídos.`)
      }
      return comAviso(
        {
          ...estado,
          personagem: {
            ...personagem,
            pontos: comPonto(personagem.pontos, acao.atributo),
            pontosLivres: personagem.pontosLivres - 1,
          },
        },
        null,
      )
    }

    case 'avancarMissao': {
      const personagem = estado.personagem
      if (personagem === null) return comAviso(estado, 'Sem personagem.')
      if (estado.fase === 'criacao' && personagem.pontosLivres > 0) {
        return comAviso(
          estado,
          `Distribua os ${personagem.pontosLivres} pontos que faltam antes de sair.`,
        )
      }
      return comAviso({ ...estado, fase: avancarFase(estado.fase) }, null)
    }

    case 'mover': {
      const personagem = estado.personagem
      if (personagem === null) return comAviso(estado, 'Sem personagem.')
      if (estado.dialogo !== null) return comAviso(estado, null)
      if (estado.batalha !== null) return comAviso(estado, null)

      return avancaMundo(estado, moverHeroi(estado.mundo, acao.direcao), deps)
    }

    case 'moverFluido': {
      const personagem = estado.personagem
      if (personagem === null) return comAviso(estado, 'Sem personagem.')
      if (acao.dt <= 0) return comAviso(estado, null)
      if (estado.dialogo !== null) return comAviso(estado, null)
      if (estado.batalha !== null) return comAviso(estado, null)

      const movido = moverHeroiFluido(
        estado.mundo,
        acao.direcao,
        acao.dt,
        velocidadeDoHeroi(personagem),
      )
      return avancaMundo(estado, movido, deps)
    }

    case 'passarTempo': {
      // Um tick, não um segundo: quem desenha chama `passarTempo` a
      // `TICKS_VAGAR_POR_SEGUNDO` vezes por segundo. O tempo do mundo só anda
      // fora de batalha e fora de diálogo, porque neles quem decide o ritmo é
      // o jogador.
      if (estado.batalha !== null || estado.dialogo !== null) {
        return comAviso(estado, null)
      }
      if (estado.personagem === null) return comAviso(estado, null)

      return avancaMundo(estado, vagarGoblins(estado.mundo, deps.rng), deps)
    }

    case 'interagir': {
      if (estado.personagem === null) return comAviso(estado, 'Sem personagem.')

      if (estado.dialogo !== null) return proximoDialogo(estado)

      const alvo = alvoInteracao(estado.mundo)
      if (alvo === null) return comAviso(estado, 'Não há nada aqui.')

      if (alvo.tipo === 'npc') {
        return comAviso(
          { ...estado, dialogo: { rota: alvo.npc.rota, pagina: 0 } },
          null,
        )
      }

      const item = alvo.lote.item
      return comAviso(
        {
          ...estado,
          mundo: pegarLote(estado.mundo, alvo.lote.id),
          bag: [...estado.bag, item],
        },
        `${item.nome} foi para a bag.`,
      )
    }

    case 'avancarDialogo':
      return proximoDialogo(estado)

    case 'fecharDialogo':
      return comAviso({ ...estado, dialogo: null }, null)

    case 'iniciarBatalha': {
      const personagem = estado.personagem
      if (personagem === null) {
        return comAviso(estado, 'Crie o personagem antes de entrar em batalha.')
      }

      const bonus = bonusDe(personagem.itensEquipados, CATALOGO_ITENS)
      const heroi = criarUnidadeHeroi(
        'heroi',
        personagem.nome,
        personagem.classe,
        derivados(personagem.pontos, bonus),
        POSICAO_HEROI_BATALHA,
      )
      const inimigos = criarUnidadesGoblin(acao.grupoId, acao.posInimigos.length, acao.posInimigos)
      const batalha = criarBatalha(heroi, inimigos)
      const snapshot = criarSnapshot(estado.fase, personagem, batalha)
      deps.armazenamento.gravar(gravarSnapshot(snapshot))

      return comAviso(
        { ...estado, fase: 'batalha', batalha, snapshot },
        null,
      )
    }

    case 'agir':
      return reduzirBatalha(estado, acao.acao, deps)

    case 'reiniciarBatalha': {
      const snapshot = estado.snapshot ?? lerSnapshot(deps.armazenamento.ler())
      if (snapshot === null) {
        return comAviso(estado, 'Não há snapshot para reiniciar a batalha.')
      }
      return comAviso(
        { ...estado, fase: 'batalha', batalha: batalhaDoSnapshot(snapshot), snapshot },
        null,
      )
    }

    case 'abandonarBatalha':
      return comAviso(
        { ...fecharBatalha(estado, 'criacao'), personagem: null },
        'Você foi derrotado',
      )

    case 'equipar': {
      const personagem = estado.personagem
      if (personagem === null) return comAviso(estado, 'Sem personagem.')
      const item = estado.bag.find((candidato) => candidato.id === acao.itemId)
      if (item === undefined) return comAviso(estado, 'Esse item não está na bag.')
      if ('cura' in item) return comAviso(estado, 'Consumível não equipa.')

      return comAviso(
        {
          ...estado,
          bag: estado.bag.filter((candidato) => candidato.id !== acao.itemId),
          personagem: {
            ...personagem,
            itensEquipados: [...personagem.itensEquipados, (item as Item).id],
          },
        },
        null,
      )
    }

    case 'desequipar': {
      const personagem = estado.personagem
      if (personagem === null) return comAviso(estado, 'Sem personagem.')
      if (!personagem.itensEquipados.includes(acao.itemId)) {
        return comAviso(estado, 'Esse item não está equipado.')
      }
      const item = buscarItem(acao.itemId)

      return comAviso(
        {
          ...estado,
          bag: item === undefined ? estado.bag : [...estado.bag, item],
          personagem: {
            ...personagem,
            itensEquipados: personagem.itensEquipados.filter((id) => id !== acao.itemId),
          },
        },
        null,
      )
    }

    case 'gastarPonto': {
      // Ponto de batalha é bônus, e não um dos 12 da criação. Por isso ele não
      // mexe em pontosLivres, e por isso o total distribuído pode passar de 12.
      const personagem = estado.personagem
      if (personagem === null) return comAviso(estado, 'Sem personagem.')
      if (estado.pontosPendente <= 0) return comAviso(estado, 'Não há ponto para gastar.')

      const pontosRestantes = estado.pontosPendente - 1
      const fase = pontosRestantes === 0 && estado.fase === 'retorno' ? 'cidade' : estado.fase

      return comAviso(
        {
          ...estado,
          fase,
          pontosPendente: pontosRestantes,
          personagem: {
            ...personagem,
            pontos: comPonto(personagem.pontos, acao.atributo),
          },
        },
        null,
      )
    }
  }
}

// E no meio do diálogo avança a página, e na última página fecha. Uma tecla só
// para as duas coisas, que é como diálogo funciona em RPG de turno.
function proximoDialogo(estado: EstadoJogo): EstadoJogo {
  const dialogo = estado.dialogo
  if (dialogo === null) return estado

  const paginas = dialogoDe(dialogo.rota)
  const proxima = dialogo.pagina + 1

  if (proxima >= paginas.length) return { ...estado, dialogo: null }
  return { ...estado, dialogo: { rota: dialogo.rota, pagina: proxima } }
}

export function paginaDoDialogo(estado: Readonly<EstadoJogo>): string {
  const dialogo = estado.dialogo
  if (dialogo === null) return ''
  const pagina = dialogoDe(dialogo.rota)[dialogo.pagina]
  return pagina?.texto ?? ''
}

export function nomeDoDialogo(estado: Readonly<EstadoJogo>): string {
  const dialogo = estado.dialogo
  if (dialogo === null) return ''
  const pagina = dialogoDe(dialogo.rota)[dialogo.pagina]
  return pagina?.nome ?? ''
}