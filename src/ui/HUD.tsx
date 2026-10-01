import { useEffect } from 'react'
import type { AcaoJogo, EstadoJogo } from '../game/estado'

// A HUD só mostra. Ela recebe o estado e a função de despachar, e não calcula
// vida, não arredonda regra e não decide o que é aviso: tudo isso já vem pronto
// de `game`. A única coisa que a HUD decide é QUANDO o aviso some, porque esse é
// um tempo de apresentação, e tempo de tela não é regra de jogo.

const SEGUNDOS_AVISO = 3

export function HUD({
  estado,
  despachar,
}: {
  estado: Readonly<EstadoJogo>
  despachar: (acao: AcaoJogo) => void
}) {
  const vitais = estado.mundo.vitais
  const aviso = estado.aviso

  // O aviso some sozinho. O efeito roda quando o aviso muda, então um aviso novo
  // recomeça a contagem, e trocar de estado por outro motivo não reinicia o
  // tempo do aviso que já está na tela.
  useEffect(() => {
    if (aviso === null) return
    const temporizador = setTimeout(() => {
      despachar({ tipo: 'limparAviso' })
    }, SEGUNDOS_AVISO * 1000)
    return () => clearTimeout(temporizador)
  }, [aviso, despachar])

  return (
    <div className="hud">
      {aviso !== null && (
        <p className="hud__aviso" role="status">
          {aviso}
        </p>
      )}
      <div className="hud__barras">
        <Barra
          nome="Vida"
          valor={vitais.vida}
          maximo={vitais.vidaMaxima}
          preenchimento="hud__barra--vida"
        />
        <Barra
          nome="Mana"
          valor={vitais.mana}
          maximo={vitais.manaMaxima}
          preenchimento="hud__barra--mana"
        />
      </div>
    </div>
  )
}

function Barra({
  nome,
  valor,
  maximo,
  preenchimento,
}: {
  nome: string
  valor: number
  maximo: number
  preenchimento: string
}) {
  // A barra mostra o número arredondado, porque o estado guarda a regeneração
  // fracionária, e uma barra escrito "10,999999" é mentira de tela. O
  // arredondamento é de apresentação: o estado continua com o valor exato.
  const shown = Math.max(0, Math.round(valor))
  const teto = Math.max(1, Math.round(maximo))
  const porcento = Math.max(0, Math.min(100, (shown / teto) * 100))

  return (
    <div className="hud__barra">
      <span className="hud__barraNome">{nome}</span>
      <div
        className={`hud__barraTrilho ${preenchimento}`}
        role="meter"
        aria-label={nome}
        aria-valuenow={shown}
        aria-valuemin={0}
        aria-valuemax={teto}
      >
        <div className="hud__barraPreenchida" style={{ width: `${porcento}%` }} />
      </div>
      <span className="hud__barraNumero">
        {shown}/{teto}
      </span>
    </div>
  )
}
