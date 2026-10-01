import { useEffect, useReducer, useRef, useState } from 'react'
import { TICKS_VAGAR_POR_SEGUNDO } from '../game/mapa'
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
import { criarCena, type Cena } from '../render/cena'
import { CriacaoPersonagem } from './CriacaoPersonagem'
import { Dialogo } from './Dialogo'
import { HUD } from './HUD'
import { calcularTicks } from './relogio'
import { acaoDeTecla, direcaoDasTeclas, ehTeclaDeMovimento } from './teclado'

// Componente temporário até a issue 2 montar as telas de verdade. Aqui só o que
// liga a cena do Pixi ao estado do jogo: guardar o estado, transformar tecla em
// intenção, chamar `passarTempo` na taxa certa e redesenhar quando o estado
// muda. Nenhuma regra mora neste arquivo.

export function Mundo() {
  const palco = useRef<HTMLDivElement>(null)
  const cena = useRef<Cena | null>(null)
  const teclas = useRef(new Set<string>())
  const acumulado = useRef(0)
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

  // O laço de desenho não pode despachar a cada quadro sem redesenhar, senão o
  // goblin andaria e o jogador veria o mundo um tick atrasado. Aqui a regra
  // avança, e o efeito abaixo é que leva o estado novo para a cena.
  useEffect(() => {
    estadoRef.current = estado
  }, [estado])

  useEffect(() => {
    const elemento = palco.current
    if (elemento === null) return

    let viva = true
    let montada: Cena | null = null
    // O `resizeTo` do Pixi já cuida do renderer quando a janela muda, mas o
    // retângulo do fade é nosso: sem esta observação, o fade ficaria do tamanho
    // antigo da tela depois de um redimensionamento.
    const observador = new ResizeObserver((entradas) => {
      const caixa = entradas[0]?.contentRect
      if (caixa === undefined) return
      montada?.redimensionar(caixa.width, caixa.height)
    })
    observador.observe(elemento)

    function quadro(segundos: number): void {
      if (montada === null) return

      const direcao = direcaoDasTeclas(teclas.current)
      // Sem tecla nenhuma não há o que despachar. Despachar mesmo assim devolvia
      // estado novo a 60 quadros por segundo e o React redesenhava a tela
      // inteira sem nada ter mudado.
      if (direcao !== null) despachar({ tipo: 'moverFluido', direcao, dt: segundos })

      const relogio = calcularTicks(acumulado.current, segundos, TICKS_VAGAR_POR_SEGUNDO)
      acumulado.current = relogio.acumulado
      for (let i = 0; i < relogio.ticks; i += 1) despachar({ tipo: 'passarTempo' })
    }

    void criarCena(elemento).then((c) => {
      if (!viva) {
        c.destruir()
        return
      }
      montada = c
      cena.current = c
      c.aoQuadro(quadro)
      // O primeiro desenho acontece aqui, e não no efeito de estado: este
      // efeito roda antes de a cena existir, porque criar a cena é assíncrono.
      c.desenhar(estadoRef.current, null)
      void c.entrar()
    })

    return () => {
      viva = false
      observador.disconnect()
      montada?.destruir()
      cena.current = null
    }
  }, [])

  useEffect(() => {
    cena.current?.desenhar(estado, null)
  }, [estado])

  useEffect(() => {
    function aoPressionar(evento: KeyboardEvent): void {
      if (ehTeclaDeMovimento(evento.code)) {
        teclas.current.add(evento.code)
        evento.preventDefault()
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
      ) : (
        <>
          <HUD estado={estado} despachar={despachar} />
          <Dialogo estado={estado} despachar={despachar} />
        </>
      )}
    </div>
  )
}
