import { bonusDe, comPonto, derivados, derivadosDoPersonagem, PONTOS_INICIAIS } from './atributos'
import {
  acaoAutomatica,
  acoesDisponiveis,
  aplicarAcao,
  criarBatalha,
  criarUnidadeHeroi,
  criarUnidadesGoblin,
  recompensaVitoria,
  unidadeAtual as unidadeDoTurno,
  type ItensUsaveis,
} from './combate'
import { dialogoDe } from './dialogos'
import { CATALOGO_ITENS, buscarItem, sortearDropDeGoblin } from './itens'
import { FASE_INICIAL, avancarFase } from './missoes'
import { regenerarVitais, TICKS_VAGAR_POR_SEGUNDO } from './mapa'
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
  type Vitais,
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
  mostrarBag?: boolean
  mostrarMinimapa?: boolean
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
  | { tipo: 'limparAviso' }
  | { tipo: 'iniciarBatalha'; grupoId: string; posInimigos: readonly Posicao[] }
  | { tipo: 'agir'; acao: AcaoBatalha }
  | { tipo: 'turnoInimigo' }
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

// Vitais no máximo, a partir dos pontos e dos itens do personagem. É o que a
// criação e a Distribuição de ponto usam: na fase de criação o herói ainda não
// levou dano nenhum, então subir um atributo tem que encher a barra junto, e não
// deixar o jogador com a vida presa no valor antigo.
function vitaisCheios(personagem: Readonly<Personagem>): Vitais {
  const bonus = bonusDe(personagem.itensEquipados, CATALOGO_ITENS)
  const d = derivados(personagem.pontos, bonus)
  return { vida: d.vidaMaxima, vidaMaxima: d.vidaMaxima, mana: d.manaMaxima, manaMaxima: d.manaMaxima }
}

// Recalcula os máximos de vida e mana a partir dos pontos e dos itens, e
// preserva a vida e a mana que o herói tem agora. Dois casos:
//
// 1. O jogador equipou item ou gastou ponto de batalha, então o máximo mudou e a
//    vida atual só pode subir até ele, nunca descer junto. A vida atual não enche
//    sozinha: ganhar atributo dá teto, não cura, senão trocar equipamento
//    viraria uma forma de curar que o balanceamento não pediu.
// 2. O máximo diminuiu, por exemplo depois de desequipar, e aí a vida e a mana
//    são cortadas no máximo novo, porque não dá para ter mais vida do que o
//    corpo aguenta.
function vitaisDoPersonagem(
  personagem: Readonly<Personagem>,
  vitaisAtuais: Readonly<Vitais>,
): Vitais {
  const bonus = bonusDe(personagem.itensEquipados, CATALOGO_ITENS)
  const d = derivados(personagem.pontos, bonus)
  return {
    vidaMaxima: d.vidaMaxima,
    manaMaxima: d.manaMaxima,
    vida: Math.min(vitaisAtuais.vida, d.vidaMaxima),
    mana: Math.min(vitaisAtuais.mana, d.manaMaxima),
  }
}

// Pega a vida e a mana que o herói saiu da batalha com e devolve para a
// exploração. A unidade de batalha é a fonte da verdade enquanto a batalha dura,
// e esta é a ponte que faz o dano de uma batalha chegar na exploração seguinte.
//
// Se a batalha vier sem herói, o que é um estado que a regra não produz, o
// retorno cai nos vitais de antes. Zerar a vida aqui pareceria derrota e mataria
// o jogador em silêncio.
function vitaisDoBatalha(
  batalha: Readonly<EstadoBatalha>,
  anteriores: Readonly<Vitais>,
): Vitais {
  const heroi = batalha.unidades.find((unidade) => unidade.ehHeroi)
  if (heroi === undefined) return anteriores

  return {
    vida: heroi.vida,
    vidaMaxima: heroi.vidaMaxima,
    mana: heroi.mana,
    manaMaxima: heroi.manaMaxima,
  }
}

// Recalcula os vitais depois que o personagem mudou por causa de item ou de
// ponto de batalha. É o mesmo caminho de `distribuirPonto`: o máximo sai dos
// derivados, e a vida e a mana atuais são preservadas até ele.
function comPersonagemEQVitais(
  estado: Readonly<EstadoJogo>,
  personagem: Readonly<Personagem>,
): Pick<EstadoJogo, 'personagem' | 'mundo'> {
  return {
    personagem,
    mundo: { ...estado.mundo, vitais: vitaisDoPersonagem(personagem, estado.mundo.vitais) },
  }
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

// Ações que a caixa de opções mostra no turno atual. A UI chama isso em vez de
// repetir a regra, para a caixa e a batalha nunca discordarem.
export function acoesDoTurno(estado: Readonly<EstadoJogo>): AcaoBatalha['tipo'][] {
  const batalha = estado.batalha
  if (batalha === null) return []
  const unidade = unidadeDoTurno(batalha)
  if (unidade === undefined) return []
  return acoesDisponiveis(batalha, unidade, itensUsaveis(estado))
}

// Quando o herói chega perto de um grupo de goblin, a batalha começa. O mesmo
// gatilho vale para passo discreto e para movimento contínuo, então a regra
// fica num lugar só.
//
// Esta função não mexe no aviso. Ela roda a cada quadro de movimento, e limpar o
// aviso aqui apagava a mensagem do jogador no mesmo quadro em que ela nasceu. O
// aviso sai da tela pela ação `limparAviso`, que a HUD dispara com timer.
function avancaMundo(estado: EstadoJogo, mundo: Mundo, deps: Dependencias): EstadoJogo {
  if (mundo === estado.mundo) return estado

  const grupo = grupoEmAlcance(mundo)
  if (grupo !== null && estado.fase !== 'cidade') {
    return reducer(
      { ...estado, mundo },
      { tipo: 'iniciarBatalha', grupoId: grupo.grupoId, posInimigos: grupo.posInimigos },
      deps,
    )
  }

  return { ...estado, mundo }
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
        mundo: { ...mundo, vitais: vitaisDoBatalha(proxima, estado.mundo.vitais) },
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
      return comAviso({ ...ESTADO_INICIAL, personagem, mundo: criarMundo(personagem) }, null)
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
      const novo = {
        ...personagem,
        pontos: comPonto(personagem.pontos, acao.atributo),
        pontosLivres: personagem.pontosLivres - 1,
      }
      // Subir um atributo sobe o máximo de vida ou de mana, então o máximo é
      // recalculado aqui. Na criação o herói está de vida cheia o tempo todo,
      // porque ainda não levou dano, então o máximo novo enche a barra.
      return comAviso(
        { ...estado, personagem: novo, mundo: { ...estado.mundo, vitais: vitaisCheios(novo) } },
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
      // Estas três saídas devolvem o estado como está, sem mexer no aviso. Antes
      // elas limpavam o aviso, e isso quebrava a HUD: `moverFluido` roda a cada
      // quadro, então um aviso que o jogador precisava ler sumia em menos de 16ms.
      // Movimento bloqueado não é motivo para apagar mensagem.
      if (acao.dt <= 0) return estado
      if (estado.dialogo !== null) return estado
      if (estado.batalha !== null) return estado

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
      //
      // Estas saídas também preservam o aviso, pelo mesmo motivo de `moverFluido`:
      // o tick chega 6 vezes por segundo e limpava a mensagem antes de ela poder
      // ser lida. Quem tira o aviso da tela é a ação `limparAviso`.
      if (estado.batalha !== null || estado.dialogo !== null) {
        return estado
      }
      if (estado.personagem === null) return estado

      // Regenera os vitais do herói a cada tick. A taxa é por segundo, então um
      // tick regenera `1 / TICKS_VAGAR_POR_SEGUNDO`, e a inteligência do herói
      // multiplica a regeneração de mana, como a spec pede. Usa
      // `derivadosDoPersonagem` para que um item que dá inteligência também
      // regenere mana, do mesmo jeito que ele aumenta a mana máxima.
      const vitais = regenerarVitais(
        estado.mundo.vitais,
        1 / TICKS_VAGAR_POR_SEGUNDO,
        derivadosDoPersonagem(estado.personagem, CATALOGO_ITENS).regeneracaoMana,
      )
      const mundo = { ...vagarGoblins(estado.mundo, deps.rng), vitais }

      return avancaMundo(estado, mundo, deps)
    }

    case 'interagir': {
      if (estado.personagem === null) return comAviso(estado, 'Sem personagem.')

      // Em batalha a tecla E não pega loot nem abre diálogo. Sem este guard, o
      // herói podia recolher o drop que estava no chão ao lado do goblin, e a
      // batalha viraria uma forma de teleportar item para a bag. Devolve o estado
      // como está, sem mexer no aviso, pelo mesmo motivo de `moverFluido`.
      if (estado.batalha !== null) return estado

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

    // A HUD esconde o aviso depois de um tempo, e esconder é mexer no estado, então
    // o pedido de limpar vem por ação. A tela decide QUANDO, e a regra decide O
    // QUE, que é a divisão do projeto.
    case 'limparAviso':
      return comAviso(estado, null)

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
        estado.mundo.vitais,
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

    // O turno do inimigo é uma ação, e não um efeito: quem despacha é a tela,
    // porque é ela que mostra a fila de turnos avançando. A regra do que o
    // goblin decide fica em `acaoAutomatica`, e o sorteio continua aqui, com o
    // gerador injetado. Uma tela que não understandesse nada de combate ainda
    // teria o turno do goblin inteiro.
    case 'turnoInimigo': {
      const batalha = estado.batalha
      if (batalha === null || batalha.fase !== 'ativa') return estado
      const acao = acaoAutomatica(batalha)
      if (acao === null) return estado
      return reduzirBatalha(estado, acao, deps)
    }

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
          ...comPersonagemEQVitais(estado, {
            ...personagem,
            itensEquipados: [...personagem.itensEquipados, (item as Item).id],
          }),
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
          ...comPersonagemEQVitais(estado, {
            ...personagem,
            itensEquipados: personagem.itensEquipados.filter((id) => id !== acao.itemId),
          }),
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
          ...comPersonagemEQVitais(estado, {
            ...personagem,
            pontos: comPonto(personagem.pontos, acao.atributo),
          }),
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