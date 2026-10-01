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
  // Tiles por segundo no mapa. Não tem nada a ver com ordem de turno, e é o que
  // uma montaria vai aumentar depois.
  velocidadeMovimento: number
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

// Consumível não equipa: soma vida na hora de usar e some da bag. A cura é
// escrita aqui, e não vem do catálogo de atributos, porque comida não dá força.
export interface Consumivel {
  id: string
  nome: string
  cura: number
}

// Tudo que pode estar na bag. Equipar só vale para Item, então os dois são
// unidos aqui em vez de repetir a distinção em cada tela.
export type ItemDaBag = Item | Consumivel

export function ehConsumivel(item: Readonly<ItemDaBag>): item is Consumivel {
  return 'cura' in item
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
  ataqueFisico: number
  ataqueDistancia: number
  danoMagico: number
  tipoAtaque: TipoAtaque
  defendendo: boolean
  // Chance de 0 a 1 de esquivar do próximo ataque. Vem junto com `defendendo`,
  // e os dois somem no começo do próximo turno da própria unidade.
  esquiva: number
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
  | { tipo: 'usarItem'; alvoId: string; itemId: string }
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

export interface Npc {
  id: string
  nome: string
  pos: Posicao
  // Chave em DIALOGOS. VendeItem é para quem vende comida, e fica vazio no
  // protótipo porque a issue da loja é futura.
  rota: string
  vendeItem: boolean
}

// Drop que caiu no chão e ainda não foi pego. O id vem do inimigo que deixou o
// item, para dois goblins do mesmo grupo não dividirem a mesma chave.
export interface LoteChao {
  id: string
  pos: Posicao
  item: ItemDaBag
}

// O que a tecla E faz depende do que está ao alcance. NPC ganha de loot, e o
// loot mais próximo ganha dos outros.
export type AlvoInteracao =
  | { tipo: 'npc'; npc: Npc }
  | { tipo: 'loot'; lote: LoteChao }

// Vida e mana que o herói carrega enquanto anda pelo mapa. São os números que a
// HUD mostra e que sobrevivem à batalha: entrar em batalha leva estes valores, e
// o que sobrar da batalha volta para estes.
//
// Não é a `Unidade` de combate de propósito. A unidade tem campo de batalha, tipo
// de ataque, defendendo e esquiva, e nada disso faz sentido enquanto o herói
// está só andando. Separar os dois também impede o turno vazar para a exploração.
export interface Vitais {
  vida: number
  vidaMaxima: number
  mana: number
  manaMaxima: number
}

export interface Mundo {
  mapa: Mapa
  heroi: Posicao
  direcaoHeroi: Direcao
  vitais: Vitais
  goblins: Goblin[]
  npcs: Npc[]
  loot: LoteChao[]
}