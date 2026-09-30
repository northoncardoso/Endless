# AGENTS.md

Instruções para quem trabalha neste repositório, humano ou agente de IA. Vale
para o código, para os commits, para as issues e para os PRs.

## O que é o Endless

Protótipo de RPG 2D em navegador, feito com React, TypeScript e PixiJS. Uma
missão só, do início ao fim: o jogador cria o personagem, recebe a missão de uma
caravana de elfos, enfrenta 2 goblins em batalha por turnos e chega até a Rainha
Kassandra, onde descobre quem é.

O design completo, com tudo que foi decidido e o que ficou de fora, está em
`docs/superpowers/specs/2026-09-30-prototipo-design.md`. Leia antes de mudar
qualquer coisa que não seja óbvia.

## Comandos

```bash
npm install        # instala
npm run dev        # dev server
npm test           # testes das regras, roda em Node, sem navegador
npm run typecheck  # TypeScript, modo estrito
npm run lint       # oxlint
npm run build      # build de produção
npm run preview    # serve o build
```

Node 24. Se o `npm` reclamar de versão, use `nvm use` antes, o `.nvmrc` está
versionado.

## A regra que organiza o projeto

**`src/game/` é TypeScript puro e não sabe que Pixi e React existem.** Nada em
`src/game/` importa nada de `src/render/` ou de `src/ui/`.

- `src/game/` tem as regras: atributos, itens, combate, mapa, missão, save.
  É a única pasta testável sem navegador, e é o que roda no CI.
- `src/render/` desenha o mundo com Pixi, lendo o estado.
- `src/ui/` desenha as telas com React, lendo o estado.

Fluxo em uma direção só: entrada vira intenção, a regra devolve mudança de
estado, quem desenha lê o estado. Se um teste precisou de navegador, a regra
estoura em `src/render/` ou em `src/ui/`, e o conserto é mover a regra para
`src/game/`.

## Convenções

- Português em código, comentários, texto de jogo, commit e PR. Identificador
  de código em inglês quando é nome de conceito de programação, em
  `camelCase` para função e variável e `PascalCase` para tipo.
- **Sem hífen e sem travessão em texto.** Use vírgula, dois pontos ou frase
  curta. É marca típica de texto gerado por IA e o autor não quer isso no
  portfólio.
- Comentário só quando o código não se explica. O código explica o como, o
  comentário explica o porquê.
- Nada de `any`. Se o tipo não fecha, o modelo está errado.
- Todo sorteio passa pelo gerador injetado em `src/game/random.ts`. Chamar
  `Math.random` dentro de `src/game/` é errado, porque quebra o teste.
- Toda constante de balanceamento é nomeada e fica no módulo que a usa, com
  fórmula escrita ao lado.
- TypeScript em modo estrito, sem exceção.

## Arte e licença, não quebrar isso

Toda a arte é do LPC, Liberated Pixel Cup, sob CC-BY-SA 3.0 e GPL 3.0.

- **A arte não vai para o git.** Os PNGs ficam em `public/assets/`, que está no
  `.gitignore`.
- O repositório é MIT, só do código. Derivação de arte CC-BY-SA dentro do
  repositório contaminaria a licença do código.
- Toda arte nova entra com autor, licença e origem em `docs/ARTE.md`, antes de
  ser usada. Sem crédito escrito, a arte não entra.
- O procedimento para gerar os sprites está em `docs/ARTE.md`.

## Como o trabalho entra

- Uma issue por mudança, com o motivo e o critério de aceite.
- Uma branch por issue, nomeada `feat/`, `fix/` ou `chore/`.
- PR com o que mudou e por quê, e linked à issue.
- Commit no formato do repositório, e a mensagem explica a razão, não só o
  diff.
- CI verde antes do merge: teste, typecheck e lint.

## Configuração do opencode neste projeto

`.opencode/opencode.json` carrega este `AGENTS.md` como instrução do projeto, e
as skills do projeto ficam em `.opencode/skills/`. As skills pessoais do autor
continuam no nível global, em `~/.config/opencode/`, e não são copiadas para
cá. Se você criar uma skill que só faz sentido neste jogo, ela é do projeto.
