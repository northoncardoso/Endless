import { useEffect, useReducer, useRef, useState } from 'react'
import {
  CHAVE_SAVE,
  ESTADO_INICIAL,
  reducer,
  type AcaoJogo,
  type Dependencias,
  type EstadoJogo,
} from '../game/estado'
import { criarSorteador } from '../game/random'
import { criarArmazenamentoLocal, criarArmazenamentoMemoria } from '../game/save'
import { Batalha } from './Batalha'
import { CriacaoPersonagem } from './CriacaoPersonagem'
import { Dialogo } from './Dialogo'
import { HUD } from './HUD'
import { Bag } from './Bag'

// Componente temporário até a issue 2 montar as telas de verdade. Aqui só o que
// liga a cena do Pixi ao estado do jogo: guardar o estado, transformar tecla em
// intenção, chamar `passarTempo` na taxa certa e redesenhar quando o estado
// muda. Nenhuma regra mora neste arquivo.

export function Mundo() {
  const palco = useRef<HTMLDivElement>(null)
  const cena = useRef<Cena | null>(null)
  const teclas = useRef(new Set<string>())
  const estadoRef = useRef<EstadoJogo>(ESTADO_INICIAL)

  // O `reducer` do jogo recebe as dependências, e elas nascem uma vez só: um
  // sorteador novo a cada quadro mudaria o resultado de cada drop. O
  // inicializador preguiçoso do `useState` garante uma instância só, sem ler ref
  // durante o desenho.
  const [deps] = useState<Dependencias>(() => ({
    rng: criarSorteador(20260930),
    armazenamento:
      typeof localStorage === 'undefined'
        ? criarArmazenamentoMemoria()
        : criarArmazenamentoLocal(CHAVE_SAVE),
  }))

  const [estado, despachar] = useReducer(
    (atual: EstadoJogo, acao: AcaoJogo) => reducer(atual, acao, deps),
    ESTADO_INICIAL,
  )

  // A unidade que o círculo no chão está marcando. Vive aqui, e não dentro da tela
  // de batalha, porque quem desenha o círculo é a cena do Pixi e quem sabe o que
  // está selecionado é a caixa de opções: as duas conversam por cima deste estado.
  const [alvoSelecionado, setAlvoSelecionado] = useState<string | null>(null)

  // O laço de desenho não pode despachar a cada quadro sem redesenhar, senão o
  // goblin andaria e o jogador veria o mundo um tick atrasado. Aqui a regra
  // avança, e o efeito abaixo é que leva o estado novo para a cena.
  useEffect(() => {
    estadoRef.current = estado
  }, [estado])

  useEffect(() => {
    cena.current?.desenhar(estado, alvoSelecionado)
  }, [estado, alvoSelecionado])

  useEffect(() => {
    function aoPressionar(evento: KeyboardEvent): void {
      // Em batalha as setas são da caixa de opções e as letras de movimento não
      // existem. A tecla que anda é a mesma, então o filtro é por fase: se
      // deixasse passar, o herói andaria com a seta que o jogador acabou de usar
      // para escolher o alvo.
      if (ehTeclaDeMovimento(evento.code)) {
        evento.preventDefault()
        if (estadoRef.current.batalha === null) teclas.current.add(evento.code)
        return
      }

      // Segurar E não abre cinco diálogos: só o primeiro aperto conta.
      if (evento.repeat) return
      const acao = acaoDeTecla(evento.code)
      if (acao === 'interagir') despachar({ tipo: 'interagir' })
      if (acao === 'fechar') despachar({ tipo: 'fecharDialogo' })
      if (acao === 'confirmar') despachar({ tipo: 'avancarMissao' })
    }

    function aoSoltar(evento: KeyboardEvent): void {
      if (!ehTeclaDeMovimento(evento.code)) return
      teclas.current.delete(evento.code)
      evento.preventDefault()
    }

    window.addEventListener('keydown', aoPressionar)
    window.addEventListener('keyup', aoSoltar)
    return () => {
      window.removeEventListener('keydown', aoPressionar)
      window.removeEventListener('keyup', aoSoltar)
    }
  }, [])

  // O palco fica montado o tempo todo, e a tela de criação vem por cima. Se o
  // palco só existisse na fase de exploração, o efeito que cria a cena rodaria
  // uma vez com o elemento ainda ausente e o canvas nunca apareceria.
  //
  // A HUD e o diálogo ficam dentro de `.area`, que cobre só o palco, e não a
  // página inteira. Se eles cobrissem o app todo, as barras desceriam por cima do
  // rodapé de dicas, que é a única parte da tela que o jogador precisa ler.
  return (
    <div className="area">
      <div ref={palco} className="palco" />
      {estado.fase === 'criacao' ? (
        <CriacaoPersonagem estado={estado} despachar={despachar} />
      ) : estado.fase === 'batalha' ? (
        <>
          <Batalha
            estado={estado}
            despachar={despachar}
            alvoSelecionado={alvoSelecionado}
            selecionarAlvo={setAlvoSelecionado}
          />
          <Dialogo estado={estado} despachar={despachar} />
        </>
      ) : (
        <>
          <HUD estado={estado} despachar={despachar} />
          <Dialogo estado={estado} despachar={despachar} />
          <Bag estado={estado} despachar={despachar} />
        </>
      )}
    </div>
  )
}
