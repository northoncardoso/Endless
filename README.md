# Endless

Protótipo de RPG 2D em navegador. Uma missão só, do início ao fim, com
personagem criado pelo jogador, mapa contínuo, batalha em turnos e uma história
que termina em revelação.

Feito com React, TypeScript e PixiJS. Regras testadas sem navegador, arte de
terceiros com crédito em ordem, e CI rodando teste, typecheck e lint a cada
push.

O design completo, incluindo o que ficou de fora e por quê, está em
[docs/superpowers/specs/2026-09-30-prototipo-design.md](docs/superpowers/specs/2026-09-30-prototipo-design.md).

## O jogo

Você é um mensageiro de um reino vizinho que chega na fronteira sem saber de
nada. A caravana de elfos da resistência conta a história e dá a missão: chegar
até a Rainha Kassandra. No caminho, 2 goblins. Na cidade, a Rainha abre a
mensagem, e você descobre que é filho bastardo de um maligno mártir que está renascendo, e
que a profecia de 100 anos diz que só você pode matá-lo.

## Como rodar

```bash
npm install
npm run dev
```

Precisa de Node 24, e o `.nvmrc` está versionado. Sobre a arte, que é gerada e
não versionada, leia [docs/ARTE.md](docs/ARTE.md).

## Estado atual

Protótipo em construção. O que já existe está no histórico de commits e nas
issues abertas.

| Parte | Situação |
|---|---|
| Spec de design | pronta e aprovada |
| Scaffold, CI e lint | pronto |
| Regras do jogo com teste | prontas, 267 testes |
| Mundo, câmera e colisão | prontos, verificados no navegador |
| Tela de criação de personagem | pronta |
| Vida e mana na exploração | prontas, atravessam a batalha |
| HUD e caixa de diálogo | prontas, verificadas no navegador |
| Save confiável com validação estrita | pronta |
| Arte do LPC | issue aberta, aguardando os sprites |
| Bag e minimapa | issue aberta |
| Tela de batalha e fila de turnos | issue aberta |

O que não existe ainda está listado como issue no repositório, para não virar
promessa de README. A regra do projeto é simples: um item novo nasce como issue
antes de virar código.

## Decisões que valem uma linha cada

- **Regras separadas de desenho.** Tudo que é regra mora em `src/game/`, em
  TypeScript puro, sem importar Pixi nem React. É o que permite testar a batalha
  inteira no CI, sem navegador.
- **Sem tela de load na batalha.** O fundo da batalha é uma imagem fixa, não há
  nada carregando. Um fade de 0,3s resolve.
- **Sem pathfinding.** Os goblins andam em volta de um ponto fixo e a batalha é
  por proximidade, então ninguém percorre o mapa. Colisão é tile sólido contra o
  jogador.
- **Sem d20.** O dano é o valor base mais ou menos 20 por cento. A variação vem
  do atributo e do item, não de sorteio.
- **Sorteio injetado.** Todo `Math.random` do jogo passa por
  `src/game/random.ts`, então o teste fixa a semente e o resultado é
  determinístico.
- **Arte fora do git.** O LPC é CC-BY-SA 3.0. Se o PNG entrasse no repositório,
  o código MIT carregaria a obrigação da arte.

## Licença

Código sob MIT, em [LICENSE](LICENSE).

Arte sob CC-BY-SA 3.0, do LPC, com o crédito em
[docs/ARTE.md](docs/ARTE.md). As duas coisas não se misturam, e por isso a arte
não está no repositório.
