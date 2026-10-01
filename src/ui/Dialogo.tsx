import { nomeDoDialogo, paginaDoDialogo } from '../game/estado'
import type { AcaoJogo, EstadoJogo } from '../game/estado'

// A caixa de diálogo lê a página que o estado já escolheu. Ela não conta página,
// não decide quando o diálogo acaba e não guarda texto: o texto mora em
// `game/dialogos.ts` e a página corrente mora em `estado.dialogo`. Este
// componente só desenha o que está lá, e por isso ele não tem regra nenhuma.
//
// A tecla de advancing e de fechar é do laço de entrada, em `Mundo.tsx`, porque
// o jogo tem uma tecla só: E abre e avança, Esc fecha. O botão na tela existe
// para o mouse e para o toque, e despacha a mesma ação que a tecla, sem caminho
// paralelo: um clique e uma tecla chegam no mesmo lugar, o reducer.

export function Dialogo({
  estado,
  despachar,
}: {
  estado: Readonly<EstadoJogo>
  despachar: (acao: AcaoJogo) => void
}) {
  if (estado.dialogo === null) return null

  const nome = nomeDoDialogo(estado)
  const texto = paginaDoDialogo(estado)

  return (
    <div className="dialogo" role="dialog" aria-label={nome}>
      <p className="dialogo__nome">{nome}</p>
      <p className="dialogo__texto">{texto}</p>
      <div className="dialogo__acoes">
        <button type="button" onClick={() => despachar({ tipo: 'interagir' })}>
          Continuar
        </button>
        <button type="button" onClick={() => despachar({ tipo: 'fecharDialogo' })}>
          Fechar
        </button>
      </div>
    </div>
  )
}
