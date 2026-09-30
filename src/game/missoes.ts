import type { FaseMissao } from './tipos'

export const FASE_INICIAL: FaseMissao = 'criacao'

// A ordem vem do roteiro da spec, seção 9. Cada fase só avança, e o reinício
// volta para a criação de personagem.
export const PROXIMA_FASE: Readonly<Record<FaseMissao, FaseMissao | null>> = {
  criacao: 'caravana',
  caravana: 'viagem',
  viagem: 'batalha',
  batalha: 'retorno',
  retorno: 'cidade',
  cidade: 'continuar',
  continuar: null,
}

export function podeAvancar(fase: Readonly<FaseMissao>): boolean {
  return PROXIMA_FASE[fase] !== null
}

export function avancarFase(fase: Readonly<FaseMissao>): FaseMissao {
  return PROXIMA_FASE[fase] ?? fase
}

export function missaoConcluida(fase: Readonly<FaseMissao>): boolean {
  return fase === 'continuar'
}

export function ehFaseDeExploracao(fase: Readonly<FaseMissao>): boolean {
  return fase === 'caravana' || fase === 'viagem' || fase === 'retorno'
}