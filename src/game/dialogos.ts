import type { PaginaDialogo } from './tipos'

export const DIALOGOS: Readonly<Record<string, readonly PaginaDialogo[]>> = {
  caravana: [
    {
      id: 'caravana-1',
      nome: 'Elfa da caravana',
      texto:
        'Você veio do reino vizinho sem saber de nada. Ninguém te contou nada, e o que vem depois não é boa notícia.',
    },
    {
      id: 'caravana-2',
      nome: 'Elfa da caravana',
      texto:
        'O mártir vai renascer. O reino sabe disso, os Orcs sabem disso, e em cem anos ele vai voltar inteiro. Ninguém pode matar alguém que ainda não nasceu.',
    },
    {
      id: 'caravana-3',
      nome: 'Elfa da caravana',
      texto:
        'A Rainha Kassandra guarda a mensagem que explica o resto. Atravesse a fronteira e procure a cidade, mas olhe para o chão: há goblins na estrada.',
    },
  ],
  cidade: [
    {
      id: 'cidade-1',
      nome: 'Rainha Kassandra',
      texto:
        'Então é você. O mensageiro que o reino mandou sem saber o que estava mandando.',
    },
    {
      id: 'cidade-2',
      nome: 'Rainha Kassandra',
      texto:
        'Está aqui. Seu pai era o mártir, antes de morrer. E antes de ser seu pai, ele foi a primeira vida de quem vai renascer.',
    },
    {
      id: 'cidade-3',
      nome: 'Rainha Kassandra',
      texto:
        'Você é filho bastardo, o último da linhagem, e é o único que pode matar a reencarnação. A profecia de cem anos não deixa outra saída.',
    },
    {
      id: 'cidade-4',
      nome: 'Rainha Kassandra',
      texto:
        'Vá para a fronteira e leve quem puder. Enquanto o mártir não volta, o reino ainda é seu.',
    },
  ],
  fuga: [
    {
      id: 'fuga-1',
      nome: '',
      texto: 'Você fugiu da batalha.',
    },
  ],
  derrota: [
    {
      id: 'derrota-1',
      nome: '',
      texto: 'Você foi derrotado',
    },
  ],
}

export function dialogoDe(rota: string): readonly PaginaDialogo[] {
  return DIALOGOS[rota] ?? []
}