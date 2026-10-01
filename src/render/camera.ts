import { TAMANHO_TILE } from '../game/mapa'
import type { Mapa, Posicao } from '../game/tipos'

// A câmera é matemática pura, sem Pixi, para poder ser testada em Node. A cena
// em `cena.ts` é que aplica o resultado no palco.

export interface Retangulo {
  largura: number
  altura: number
}

// Zona morta: o herói anda dentro dela sem mexer a câmera. Sem isso, cada passo
// move o mundo inteiro e o jogador não consegue mirar em nada.
export const ZONA_MORTA_PADRAO: Retangulo = { largura: 48, altura: 32 }

export interface OpcoesCamera {
  zonaMorta?: Retangulo
  mundo: Retangulo
}

// Centro da câmera no mundo, depois de seguir o herói e bater nos limites do
// mapa. `centro` é o valor do quadro anterior, e o retorno é sempre um objeto
// novo, para o teste comparar sem que uma chamada mude a anterior.
export function seguirHeroi(
  centro: Readonly<Posicao>,
  heroi: Readonly<Posicao>,
  opcoes: OpcoesCamera,
): Posicao {
  const zona = opcoes.zonaMorta ?? ZONA_MORTA_PADRAO
  const meiaZonaX = zona.largura / 2
  const meiaZonaY = zona.altura / 2

  let x = centro.x
  let y = centro.y

  if (heroi.x > x + meiaZonaX) x = heroi.x - meiaZonaX
  if (heroi.x < x - meiaZonaX) x = heroi.x + meiaZonaX
  if (heroi.y > y + meiaZonaY) y = heroi.y - meiaZonaY
  if (heroi.y < y - meiaZonaY) y = heroi.y + meiaZonaY

  return limitarAoMundo({ x, y }, opcoes.mundo, zona)
}

// A câmera não sai do mapa, senão aparece o vazio em volta. Cada eixo é
// resolvido sozinho: quando o mapa é menor que a zona morta naquele eixo, o
// centro do mapa é o único lugar possível.
export function limitarAoMundo(
  centro: Readonly<Posicao>,
  mundo: Retangulo,
  zona: Retangulo = ZONA_MORTA_PADRAO,
): Posicao {
  return {
    x: limitarEixo(centro.x, mundo.largura, zona.largura),
    y: limitarEixo(centro.y, mundo.altura, zona.altura),
  }
}

function limitarEixo(valor: number, tamanho: number, zona: number): number {
  const meiaZona = zona / 2
  if (tamanho <= zona) return tamanho / 2
  if (valor < meiaZona) return meiaZona
  const maximo = tamanho - meiaZona
  if (valor > maximo) return maximo
  return valor
}

export function tamanhoDoMundo(mapa: Readonly<Mapa>): Retangulo {
  return { largura: mapa.largura * TAMANHO_TILE, altura: mapa.altura * TAMANHO_TILE }
}
