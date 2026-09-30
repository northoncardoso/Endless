export type Raca = 'humano' | 'elfo' | 'anao'

export type Classe = 'arqueiro' | 'mago' | 'cavaleiro'

export type Direcao = 'cima' | 'baixo' | 'esquerda' | 'direita'

export interface PontosAtributo {
  forca: number
  agilidade: number
  inteligencia: number
}

export interface Derivados {
  vidaMaxima: number
  ataqueFisico: number
  ataqueDistancia: number
  danoMagico: number
  manaMaxima: number
  regeneracaoMana: number
  velocidade: number
}

export type AtributoEquipavel =
  | 'forca'
  | 'agilidade'
  | 'inteligencia'
  | 'vida'
  | 'mana'

export type BonusEquipado = Partial<Record<AtributoEquipavel, number>>

export interface Item {
  id: string
  nome: string
  bonus: BonusEquipado
}

export interface Personagem {
  nome: string
  raca: Raca
  classe: Classe
  pontos: PontosAtributo
  itensEquipados: string[]
  pontosLivres: number
}

export interface Posicao {
  x: number
  y: number
}

export type TipoAtaque = 'fisico' | 'distancia'

export interface Unidade {
  id: string
  nome: string
  pos: Posicao
  vida: number
  vidaMaxima: number
  mana: number
  manaMaxima: number
  velocidade: number
  ataqueFisico: number
  ataqueDistancia: number
  danoMagico: number
  tipoAtaque: TipoAtaque
  defendendo: boolean
  ehHeroi: boolean
}

export interface Goblin {
  id: string
  grupoId: string
  pos: Posicao
  pontoFixo: Posicao
  direcao: Direcao
  pausaRestante: number
}

export interface Mapa {
  largura: number
  altura: number
  solidos: boolean[]
}

export type FaseMissao =
  | 'criacao'
  | 'caravana'
  | 'viagem'
  | 'batalha'
  | 'retorno'
  | 'cidade'
  | 'continuar'

export type FaseBatalha = 'ativa' | 'vitoria' | 'fuga' | 'derrota'

export type AcaoBatalha =
  | { tipo: 'atacar'; alvoId: string }
  | { tipo: 'habilidade'; alvoId: string }
  | { tipo: 'defender' }
  | { tipo: 'fugir' }

export interface EstadoBatalha {
  fase: FaseBatalha
  unidades: Unidade[]
  ordem: string[]
  indiceTurno: number
}

export interface PaginaDialogo {
  id: string
  nome: string
  texto: string
}