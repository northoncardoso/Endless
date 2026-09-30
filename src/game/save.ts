import { VERSAO_SAVE, ehSnapshotValido } from './validacao'
import type { EstadoBatalha, FaseMissao, Personagem, Posicao, Unidade } from './tipos'

export { VERSAO_SAVE }

// Acima disto não é snapshot deste jogo, é lixo ocupando o localStorage. Um
// snapshot com duas unidades cabe com folga em 4 KiB.
export const TAMANHO_MAXIMO_SAVE = 4096

export interface SnapshotBatalha {
  versao: number
  faseMissao: FaseMissao
  personagem: Personagem
  unidadeHeroi: Unidade
  unidadesInimigas: Unidade[]
  posHeroi: Posicao
}

// O snapshot é uma cópia do momento. Sem clonar, reiniciar a batalha
// devolveria as mesmas unidades da batalha original, e qualquer mudança depois
// do reinício corromperia o snapshot junto.
export function criarSnapshot(
  faseMissao: FaseMissao,
  personagem: Personagem,
  batalha: Readonly<EstadoBatalha>,
): SnapshotBatalha {
  const unidadeHeroi = batalha.unidades.find((unidade) => unidade.ehHeroi)
  if (unidadeHeroi === undefined) {
    throw new Error('Batalha sem herói não pode virar snapshot')
  }

  return {
    versao: VERSAO_SAVE,
    faseMissao,
    personagem: {
      ...personagem,
      pontos: { ...personagem.pontos },
      itensEquipados: [...personagem.itensEquipados],
    },
    unidadeHeroi: { ...unidadeHeroi, pos: { ...unidadeHeroi.pos } },
    unidadesInimigas: batalha.unidades
      .filter((unidade) => !unidade.ehHeroi)
      .map((unidade) => ({ ...unidade, pos: { ...unidade.pos } })),
    posHeroi: { ...unidadeHeroi.pos },
  }
}

export function batalhaDoSnapshot(snapshot: Readonly<SnapshotBatalha>): EstadoBatalha {
  const unidades = [snapshot.unidadeHeroi, ...snapshot.unidadesInimigas]
  // Lado fixo, igual a `criarBatalha`: herói primeiro, inimigos na ordem do
  // snapshot. Reiniciar precisa devolver a mesma ordem, senão o reinício muda a
  // batalha.
  return {
    fase: 'ativa',
    unidades,
    ordem: unidades.map((unidade) => unidade.id),
    indiceTurno: 0,
  }
}

// A string vem do localStorage, então é dado externo. Um save editado à mão, de
// uma versão antiga, ou grande demais para ser snapshot precisa ser descartado
// sem quebrar o jogo. A regra campo a campo está em `validacao.ts`.
export function lerSnapshot(serializado: string | null): SnapshotBatalha | null {
if (serializado === null) return null

  // A string pode ser enorme, e um payload grande trava a aba no JSON.parse sem
  // lançar erro, então o tamanho é cortado antes.
  if (serializado.length > TAMANHO_MAXIMO_SAVE) return null
  try {
    const dado: unknown = JSON.parse(serializado)
    return ehSnapshotValido(dado) ? dado : null
  } catch {
    return null
  }
}

export function gravarSnapshot(snapshot: Readonly<SnapshotBatalha>): string {
  return JSON.stringify(snapshot)
}

export interface Armazenamento {
  ler(): string | null
  gravar(valor: string): void
}

export function criarArmazenamentoMemoria(): Armazenamento {
  let conteudo: string | null = null
  return {
    ler: () => conteudo,
    gravar: (valor) => {
      conteudo = valor
    },
  }
}

export function criarArmazenamentoLocal(chave: string): Armazenamento {
  return {
    ler: () => {
      try {
        return globalThis.localStorage?.getItem(chave) ?? null
      } catch {
        return null
      }
    },
    gravar: (valor) => {
      try {
        globalThis.localStorage?.setItem(chave, valor)
      } catch {
        // Modo privado e afins. O snapshot continua valendo em memória.
      }
    },
  }
}