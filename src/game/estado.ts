import { bonusDe, comPonto, derivados, PONTOS_INICIAIS } from './atributos'
import {
  aplicarAcao,
  criarBatalha,
  criarUnidadeHeroi,
  criarUnidadesGoblin,
  recompensaVitoria,
  usaMana,
} from './combate'
import { CATALOGO_ITENS, sortearDrop } from './itens'
import { FASE_INICIAL, avancarFase } from './missoes'
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
import type {
  AcaoBatalha,
  Classe,
  EstadoBatalha,
  FaseMissao,
  Item,
  Personagem,
  PontosAtributo,
  Posicao,
  Raca,
} from './tipos'

export const CHAVE_SAVE = 'endless:batalha'
export const POSICAO_HEROI_BATALHA: Readonly<Posicao> = { x: 64, y: 96 }

export interface EstadoJogo {
  fase: FaseMissao
  personagem: Personagem | null
  bag: Item[]
  batalha: EstadoBatalha | null
  snapshot: SnapshotBatalha | null
  pontosPendente: number
  aviso: string | null
}

export type AcaoJogo =
  | { tipo: 'criarPersonagem'; nome: string; raca: Raca; classe: Classe }
  | { tipo: 'distribuirPonto'; atributo: keyof PontosAtributo }
  | { tipo: 'avancarMissao' }
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
  batalha: null,
  snapshot: null,
  pontosPendente: 0,
  aviso: null,
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

  const resultado = aplicarAcao(batalha, acao, deps.rng)
  if (!resultado.ok) return comAviso(estado, resultado.motivo)

  const proxima = resultado.estado

  if (proxima.fase === 'derrota') {
    return comAviso({ ...estado, batalha: proxima }, null)
  }

  if (proxima.fase === 'vitoria' || proxima.fase === 'fuga') {
    const recompensa = proxima.fase === 'vitoria'
      ? recompensaVitoria(proxima, () => sortearDrop(deps.rng))
      : { itens: [], pontosAtributo: 0 }
    return comAviso(
      {
        ...fecharBatalha(estado, 'retorno'),
        bag: [...estado.bag, ...recompensa.itens],
        pontosPendente: estado.pontosPendente + recompensa.pontosAtributo,
      },
      proxima.fase === 'fuga' ? 'Você fugiu da batalha.' : null,
    )
  }

  return comAviso({ ...estado, batalha: proxima }, null)
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

      return comAviso(
        {
          ...estado,
          bag: estado.bag.filter((candidato) => candidato.id !== acao.itemId),
          personagem: {
            ...personagem,
            itensEquipados: [...personagem.itensEquipados, item.id],
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
      const item = CATALOGO_ITENS.find((candidato) => candidato.id === acao.itemId)

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

export function mostrarManaDoPersonagem(estado: EstadoJogo): boolean {
  return estado.personagem !== null && usaMana(estado.personagem.classe)
}