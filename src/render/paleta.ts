// Paleta do desenho.
//
// A arte do LPC não está versionada, então o jogo precisa rodar antes de ela
// existir. Estes retângulos são placeholders: existem para a câmera, a colisão e
// o vagar terem o que mostrar. Quando a arte entrar, a troca acontece toda
// aqui e em `texturas.ts`, sem tocar em `cenario.ts` nem em `atores.ts`.
export const PALETA = {
  grama: 0x4a7a3a,
  gramaEscura: 0x3d6630,
  terra: 0x8a6a45,
  pedra: 0x8d8d96,
  pedraTopo: 0xb0b0bb,
  madeira: 0x7a5230,
  heroi: 0x2f5fa8,
  heroiOlhos: 0x1b1b1f,
  heroiPele: 0xe8c39e,
  npc: 0x7a3fa8,
  goblin: 0x5f8f3a,
  goblinOculos: 0x1b1b1f,
  loot: 0xd8b23a,
  lootBrilho: 0xffe9a0,
  alvo: 0xf2f2f2,
  fade: 0x0a0a0c,
  texto: 0xe8e6e3,
  defesa: 0xc9a227,
  batalhaCeu: 0x1b2430,
  batalhaMorro: 0x2b3844,
  batalhaPedra: 0x3d4c5a,
  batalhaTerra: 0x5a4632,
  batalhaChao: 0x74604a,
  batalhaVida: 0xb3402f,
  batalhaMana: 0x3a6ea5,
  batalhaBarra: 0x0b0d12,
  batalhaBorda: 0xc9a227,
} as const

// A ficha do LPC é 64 por 64. O placeholder é menor, mas usa as mesmas
// proporções, para o desenho não mudar de tamanho quando a arte entrar.
export const TAMANHO_ATOR = 16
export const ALTURA_CORPO = 12
export const ALTURA_CABECA = 4
