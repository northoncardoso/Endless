import { useEffect, useState } from 'react'
import {
  alvosPara,
  proximoAlvo,
  unidadeAtual,
  type TipoAcaoBatalha,
} from '../game/combate'
import {
  acoesDoTurno,
  consumiveisDaBag,
  type AcaoJogo,
  type EstadoJogo,
} from '../game/estado'
import type { Direcao, Unidade } from '../game/tipos'
import { moverCursor } from './selecao'
import { direcaoDeSelecao } from './teclado'

// A tela da batalha, no estilo de RPG de turno. Ela não calcula nada: as ações
// disponíveis, os alvos válidos e o turno atual saem de `game`, e o que sobra aqui
// é o que só existe na tela, que é em que passo da escolha o jogador está.
//
// Quem está na arena, com barra de vida e fila de turnos, é desenhado pelo Pixi em
// `render/batalha.ts`. Aqui fica o que precisa de texto e de botão.

// Tempo que o turno do goblin fica na tela antes da ação sair. A regra não tem
// relógio, e é por isso que este número é daqui: o jogador precisa ver a fila
// avançando, senão a ordem dos turnos vira um piscar.
const SEGUNDOS_TURNO_INIMIGO = 0.6

const ROTULOS: Readonly<Record<TipoAcaoBatalha, string>> = {
  atacar: 'Atacar',
  habilidade: 'Habilidade',
  usarItem: 'Usar item',
  defender: 'Defender',
  fugir: 'Fugir',
}

// Em que passo da escolha o jogador está. A escolha em si, o alvo escolhido e o
// cursor são estado da tela e não da batalha: são coisas de apresentação, e a
// batalha só fica sabendo que um turno aconteceu.
type Passo =
  | { etapa: 'acoes' }
  | { etapa: 'alvo'; acao: 'atacar' | 'habilidade' }
  | { etapa: 'item' }
  | { etapa: 'fuga' }

const PRIMEIRO_PASSO: Passo = { etapa: 'acoes' }

export function Batalha({
  estado,
  despachar,
  alvoSelecionado,
  selecionarAlvo,
}: {
  estado: Readonly<EstadoJogo>
  despachar: (acao: AcaoJogo) => void
  alvoSelecionado: string | null
  selecionarAlvo: (id: string | null) => void
}) {
  const [passo, setPasso] = useState<Passo>(PRIMEIRO_PASSO)
  const [destaque, setDestaque] = useState(0)

  const batalha = estado.batalha
  const unidade = batalha === null ? undefined : unidadeAtual(batalha)
  const consumiveis = consumiveisDaBag(estado)

  // A chave do turno. Enquanto ela é a mesma, a escolha do jogador continua valendo.
  // Ela muda quando o turno passa para outro, quando a fase muda e quando alguém
  // morre, e aí a tela volta para a lista de ações.
  const turno = `${batalha?.fase ?? ''}:${batalha?.indiceTurno ?? -1}:${unidade?.id ?? ''}`



  useEffect(() => {
    setPasso(PRIMEIRO_PASSO)
    setDestaque(0)
    selecionarAlvo(null)
  }, [turno, selecionarAlvo])

  const ativa = batalha !== null && batalha.fase === 'ativa'
  const emTurnoInimigo = ativa && unidade !== undefined && !unidade.ehHeroi

  // O turno do goblin sai sozinho, e a tela só precisa saber que é vez dele. O que
  // ele decide é `acaoAutomatica`, em `combate.ts`, então trocar a tela por outra
  // não mudaria uma linha do turno do inimigo.
  useEffect(() => {
    if (!emTurnoInimigo) return
    const temporizador = setTimeout(() => {
      despachar({ tipo: 'turnoInimigo' })
    }, SEGUNDOS_TURNO_INIMIGO * 1000)
    return () => clearTimeout(temporizador)
  }, [emTurnoInimigo, turno, despachar])


  useEffect(() => {
    function aoPressionar(evento: KeyboardEvent): void {
      if (evento.repeat) return
      const direcao = direcaoDeSelecao(evento.code)
      if (direcao !== null) {
        evento.preventDefault()
        mover(direcao)
        return
      }
      if (evento.code === 'Enter' || evento.code === 'Space') {
        evento.preventDefault()
        confirmar()
        return
      }
      if (evento.code === 'Escape') {
        evento.preventDefault()
        voltar()
      }
    }
    window.addEventListener('keydown', aoPressionar)
    return () => window.removeEventListener('keydown', aoPressionar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (batalha === null || unidade === undefined) return null

  // `mover`, `escolher` e `confirmar` são declarações de função, e declaração é
  // içada: o TypeScript analisa o corpo delas com o tipo declarado, sem enxergar
  // o guard de cima. Estes dois nomes guardam o tipo já estreitado para dentro
  // de `escolher` e `confirmar`, que é onde `batalha` e `unidade` voltam a aparecer.
  const batalhaEmJogo = batalha
  const unidadeDoTurno = unidade

  // Só aparece ação que pode ser usada agora, então a caixa e a batalha nunca
  // discordam. Quem monta a lista é a regra, com a bag do estado.
  const acoes = ativa && unidade.ehHeroi ? acoesDoTurno(estado) : []

  // Alvos válidos da ação escolhida, na ordem em que o jogador vai ver o alvo
  // girar. A lista vem pronta de `alvosPara`, e a tela não filtra alvo por conta
  // própria, nem para o círculo nem para o botão.
  const alvos =
    passo.etapa === 'alvo'
      ? alvosPara(batalha, unidade, { tipo: passo.acao, alvoId: alvoSelecionado ?? '' }, { consumiveis })
      : []

  function mover(direcao: Direcao): void {
    if (passo.etapa === 'alvo') {
      const novo = proximoAlvo(alvos, alvoSelecionado, direcao)
      selecionarAlvo(novo)
      setDestaque(Math.max(0, alvos.findIndex((candidato) => candidato.id === novo)))
      return
    }

    const tamanho = passo.etapa === 'item' ? consumiveis.length : acoes.length
    setDestaque(moverCursor(tamanho, destaque, direcao))
  }

  // Escolher a ação abre o passo seguinte, e é o mesmo caminho para o clique e
  // para o Enter. Quem escolhe `defender` age na hora, porque não tem alvo nem
  // confirmação na spec.
  function escolher(indice: number): void {
    const tipo = acoes[indice]
    if (tipo === undefined) return

    if (tipo === 'atacar' || tipo === 'habilidade') {
      const lista = alvosPara(batalhaEmJogo, unidadeDoTurno, { tipo, alvoId: '' }, { consumiveis })
      selecionarAlvo(lista[0]?.id ?? null)
      setPasso({ etapa: 'alvo', acao: tipo })
      setDestaque(0)
      return
    }

    if (tipo === 'usarItem') {
      setPasso({ etapa: 'item' })
      setDestaque(0)
      return
    }

    if (tipo === 'fugir') {
      setPasso({ etapa: 'fuga' })
      return
    }

    despachar({ tipo: 'agir', acao: { tipo: 'defender' } })
  }

  function confirmar(): void {
    switch (passo.etapa) {
      case 'acoes':
        escolher(destaque)
        return
      case 'alvo': {
        if (alvoSelecionado === null) return
        despachar({ tipo: 'agir', acao: { tipo: passo.acao, alvoId: alvoSelecionado } })
        return
      }
      case 'item': {
        // O consumível cura aliado, e com um herói só o alvo possível é ele mesmo.
        // A regra valida de novo antes de agir, então um alvo impossível aqui vira
        // aviso na tela em vez de vida robada.
        const item = consumiveis[destaque]
        if (item === undefined) return
        despachar({ tipo: 'agir', acao: { tipo: 'usarItem', alvoId: unidadeDoTurno.id, itemId: item.id } })
        return
      }
      case 'fuga':
        despachar({ tipo: 'agir', acao: { tipo: 'fugir' } })
    }
  }

  function voltar(): void {
    if (passo.etapa === 'acoes') return
    setPasso(PRIMEIRO_PASSO)
    setDestaque(0)
    selecionarAlvo(null)
  }

  if (batalha.fase === 'derrota') {
    return (
      <div className="batalha">
        <div className="batalha__janela">
          <div className="batalha__painel">
            <h2 className="batalha__titulo">Você foi derrotado</h2>
            <p>
              Reiniciar volta ao começo da batalha, com a vida e a mana do momento em
              que ela começou. Desistir volta para a criação de personagem.
            </p>
            <div className="batalha__opcoes">
              <button
                className="principal"
                onClick={() => despachar({ tipo: 'reiniciarBatalha' })}
              >
                Reiniciar
              </button>
              <button onClick={() => despachar({ tipo: 'abandonarBatalha' })}>Desistir</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="batalha">
      <div className="batalha__caixa">
        {estado.aviso !== null && (
          <p className="batalha__mensagem" role="status">
            {estado.aviso}
          </p>
        )}

        {emTurnoInimigo ? (
          <p className="batalha__pergunta">{unidade.nome} está agindo.</p>
        ) : passo.etapa === 'alvo' ? (
          <>
            <p className="batalha__pergunta">
              {ROTULOS[passo.acao]}: {nomeDoAlvo(alvos, alvoSelecionado)}
            </p>
            <div className="batalha__opcoes">
              <button className="principal" onClick={confirmar}>
                Confirmar
              </button>
              <button onClick={voltar}>Voltar</button>
            </div>
          </>
        ) : passo.etapa === 'item' ? (
          <>
            <p className="batalha__pergunta">Usar item em {unidade.nome}:</p>
            <Lista
              entradas={consumiveis.map((item) => `${item.nome}, cura ${item.cura}`)}
              ativa={destaque}
              aoEscolher={(indice) => {
                setDestaque(indice)
                confirmar()
              }}
            />
          </>
        ) : passo.etapa === 'fuga' ? (
          <>
            <p className="batalha__pergunta">Deseja fugir?</p>
            <div className="batalha__opcoes">
              <button className="principal" onClick={confirmar}>
                Sim
              </button>
              <button onClick={voltar}>Não</button>
            </div>
          </>
        ) : (
          <>
            <p className="batalha__pergunta">Vez de {unidade.nome}. O que você faz?</p>
            <Lista
              entradas={acoes.map((tipo) => ROTULOS[tipo])}
              ativa={destaque}
              aoEscolher={(indice) => {
                setDestaque(indice)
                escolher(indice)
              }}
            />
          </>
        )}

        <p className="batalha__dica">
          Setas trocam a escolha, Enter confirma, Esc volta.
        </p>
      </div>
    </div>
  )
}

function Lista({
  entradas,
  ativa,
  aoEscolher,
}: {
  entradas: readonly string[]
  ativa: number
  aoEscolher: (indice: number) => void
}) {
  return (
    <ul className="batalha__lista">
      {entradas.map((entrada, indice) => (
        <li key={entrada}>
          <button
            className={indice === ativa ? 'batalha__entrada ativa' : 'batalha__entrada'}
            onClick={() => aoEscolher(indice)}
          >
            {entrada}
          </button>
        </li>
      ))}
    </ul>
  )
}

function nomeDoAlvo(alvos: readonly Unidade[], alvoSelecionado: string | null): string {
  return alvos.find((candidato) => candidato.id === alvoSelecionado)?.nome ?? 'nenhum'
}