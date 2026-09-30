---
name: arte-lpc
description: Use quando for criar, trocar ou dar crédito a qualquer sprite ou tile do Endless. Explica o gerador do LPC, onde os arquivos ficam, por que a arte não entra no git e como registrar o crédito obrigatório CC-BY-SA.
---

# Arte do Endless

Toda a arte do jogo vem do LPC, Liberated Pixel Cup. Uma skill só para não
inventar o procedimento duas vezes e para ninguém commitar PNG de terceiro por
acidente.

## Por que LPC

É o único conjunto livre que tem, no mesmo estilo e com animação de combate, as
três raças jogáveis (Humano, Elfo, Anão), as três classes (Arqueiro, Mago,
Cavaleiro) e os dois inimigos (Goblin e Orc).

- Gerador universal de spritesheet:
  https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/
- Assets base e tiles:
  https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles

## Onde os arquivos ficam

```
public/assets/personagens/   sprites do herói, NPCs e inimigos
public/assets/mundo/         tileset do mapa
public/assets/batalha/       fundo fixo de cada local de batalha
```

`public/assets/` está no `.gitignore`. A pasta existe vazia com um `.gitkeep`,
para o caminho não quebrar.

## Por que a arte não entra no git

A licença do LPC é CC-BY-SA 3.0 e GPL 3.0. Derivação de arte tem que continuar
sob CC-BY-SA. Se o PNG estivesse no repositório, o repositório inteiro passaria a
carregar essa obrigação, e o código do jogo é MIT. Então:

- código no git, sob MIT
- arte fora do git, gerada ou baixada por quem vai rodar
- `docs/ARTE.md` com o procedimento e a tabela de créditos

## Passo a passo para gerar um sprite

1. Abra o gerador universal do LPC.
2. Escolha a base do corpo: masculino ou feminino, e o tipo que casar com a
   raça. Anão e Elfo têm base própria na lista de tipos do gerador.
3. Em vestimenta, escolha o equipamento da classe:
   - Arqueiro: arco e aljava, sem armadura pesada
   - Mago: chapéu de mago e cajado
   - Cavaleiro: armadura e espada
4. Escolha as animações: `walk` com 4 direções para exploração, e `slash` ou
   `thrust` para a tela de batalha, mais `hurt` e `death`.
5. Exporte a spritesheet em PNG e salve em `public/assets/personagens/` com o
   nome da race e da classe, por exemplo `humano-arqueiro.png`.
6. **Antes de usar no jogo**, anote em `docs/ARTE.md` o que foi gerado, os
   autores dos assets usados, a licença e o link de origem. O gerador permite
   baixar essa informação em CSV.

## Regra do crédito

Sem crédito escrito, a arte não entra. `docs/ARTE.md` tem a tabela. Toda linha
nova precisa de: arquivo, autor, licença e origem.

## Cobertura de sprite por personagem

| Personagem | Base | Animação de exploração | Animação de batalha |
|---|---|---|---|
| Herói, por raça e classe | corpo do LPC | walk 4 direções | slash ou thrust, hurt, death |
| Elfos da caravana | corpo elfo | walk 4 direções | não combate na protótipo |
| Rainha Kassandra | corpo elfo ou humano | walk 4 direções | não combate |
| Goblin | goblin do LPC | walk 4 direções | slash, hurt, death |
| Orc, na próxima versão | orc do LPC | walk 4 direções | slash, hurt, death |

## O que não fazer

- Não desenha arte nova com IA generativa e não mistura no LPC. Estilo
  diferente no mesmo jogo é pior que estilo genérico.
- Não baixa pack de terceiro no meio do caminho sem registrar o crédito antes.
- Não tira os PNG do `.gitignore`.
