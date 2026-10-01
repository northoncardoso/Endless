// O relógio do laço de desenho.
//
// A regra não sabe de tempo: `passarTempo` é um tick, e o vagar dos goblins é
// contado em tick. Quem decide quantos ticks passaram é o laço, e essa conta é
// aritmética pura para poder ser testada sem navegador.
//
// O accumulate evita que a velocidade do goblin dependa da taxa de quadros. Com
// 60 fps e 6 ticks por segundo, sobra resto de tempos em quase todo quadro, e
// sem acumular o goblin andaria mais devagar na tela de 144 hz que na de 60.

export interface RelogioTicks {
  // Resto que ainda não virou tick, em segundos.
  acumulado: number
  // Ticks que devem rodar neste quadro.
  ticks: number
}

export function calcularTicks(
  acumuladoAnterior: number,
  segundosDoQuadro: number,
  ticksPorSegundo: number,
): RelogioTicks {
  if (ticksPorSegundo <= 0) return { acumulado: acumuladoAnterior, ticks: 0 }

  const acumulado = Math.max(0, acumuladoAnterior) + Math.max(0, segundosDoQuadro)
  const ticks = Math.floor(acumulado * ticksPorSegundo)

  return { acumulado: ticks === 0 ? acumulado : acumulado - ticks / ticksPorSegundo, ticks }
}
