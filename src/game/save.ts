import type { EstadoBatalha, FaseMissao, Personagem, Posicao, Unidade } from './tipos'

export const VERSAO_SAVE = 1

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
  const ordem = [...unidades]
    .sort((a, b) => b.velocidade - a.velocidade || a.id.localeCompare(b.id))
    .map((unidade) => unidade.id)
  return { fase: 'ativa', unidades, ordem, indiceTurno: 0 }
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null
}

// O save é validado na entrada, não confiado. Um save editado à mão, ou de uma
// versão antiga, precisa ser descartado sem quebrar o jogo.
export function ehSnapshotValido(valor: unknown): valor is SnapshotBatalha {
  if (!ehObjeto(valor)) return false
  if (valor.versao !== VERSAO_SAVE) return false
  if (!ehObjeto(valor.personagem)) return false
  if (!ehObjeto(valor.unidadeHeroi)) return false
  if (!Array.isArray(valor.unidadesInimigas)) return false
  return true
}

export function lerSnapshot(serializado: string | null): SnapshotBatalha | null {
  if (serializado === null) return null
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