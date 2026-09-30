# Arte do Endless

Toda a arte do jogo vem do **LPC, Liberated Pixel Cup**. Este arquivo tem duas
coisas: como conseguir os sprites, e quem tem que ser creditado.

## Por que a arte não está neste repositório

A licença do LPC é CC-BY-SA 3.0 e GPL 3.0. Derivação de arte continua sob
CC-BY-SA, e se os PNGs estivessem versionados, o repositório inteiro passaria a
carregar essa obrigação. O código do jogo é MIT, e os dois não se misturam.

Então:

- código no git, sob MIT, em `src/`
- arte fora do git, em `public/assets/`, que está no `.gitignore`
- esta tabela, que é a obrigação real da licença

## Como conseguir os sprites

### Personagens, NPCs e inimigos

Gerador universal de spritesheet do LPC:

https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/

O gerador monta o personagem por camadas: base do corpo, cabelo, vestimenta,
arma. É assim que a mesma base vira Humano, Elfo ou Anão, e como uma classe vira
equipmentamento visível.

Para cada personagem:

1. escolher a base do corpo
2. escolher a vestimenta da classe
3. pedir `walk` com 4 direções, para a exploração
4. pedir `slash` ou `thrust`, mais `hurt` e `death`, para a tela de batalha
5. exportar PNG e salvar em `public/assets/personagens/`

### Mundo e tiles

Assets base e tiles do LPC:

https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles

Salvar em `public/assets/mundo/`.

### Fundo de batalha

O fundo da batalha é a imagem fixa do local. Não precisa de arte separada: sai
de uma composição maior do próprio tileset do mundo, escurecida. Assim o
jogador reconhece o lugar onde a batalha começou.

## Créditos

Preencher antes de a arte entrar no jogo. O gerador do LPC deixa baixar a lista
de autores, licença e origem de cada imagem em CSV, e a base de tiles vem com
`CREDITS.TXT`.

| Arquivo | Conteúdo | Autores | Licença | Origem |
|---|---|---|---|---|
| pendente | sprite do herói, por raça e classe | pendente | CC-BY-SA 3.0 | gerador LPC |
| pendente | elfos da caravana | pendente | CC-BY-SA 3.0 | gerador LPC |
| pendente | Rainha Kassandra | pendente | CC-BY-SA 3.0 | gerador LPC |
| pendente | goblin | pendente | CC-BY-SA 3.0 | gerador LPC |
| pendente | tileset do mundo | pendente | CC-BY-SA 3.0 | OpenGameArt, LPC base assets |
| pendente | fundo de batalha | derivado do tileset acima | CC-BY-SA 3.0 | composição própria a partir do tileset |

Regra: sem linha preenchida aqui, o arquivo não entra no jogo.

## A tela final do jogo

A tela de Continuar, no fim do protótipo, mostra esta mesma informação de forma
curta, com o nome do LPC e o link da licença. A licença pede que o crédito seja
acessível a quem usa o jogo, e não só no repositório.
