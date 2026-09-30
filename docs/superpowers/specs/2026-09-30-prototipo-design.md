# Endless: spec de design do protótipo

- Data: 2026-09-30
- Status: aprovado para implementação
- Escopo: protótipo de uma missão, jogável do início ao fim
- Autor: Northon Cardoso

Este documento é o contrato do protótipo. O que está aqui foi decidido com o
autor antes de qualquer linha de código. O que não está aqui não existe ainda,
e está listado como issue no repositório para não ser esquecido.

---

## 1. Objetivo

Dois objetivos, nessa ordem:

1. Ser o protótipo jogável que prova que eu consigo construir um jogo 2D de
   ponta a ponta, com regra separada de desenho, arte de terceiros com licença
   em ordem, e teste automatizado.
2. Ser o peça de portfólio para a candidatura a vaga de Junior Frontend Game
   Developer, ao lado do Klok, que é a prova de produto completo.

Critério de sucesso: alguém clica no link do GitHub Pages, joga a missão inteira
em menos de 5 minutos sem ler instrução nenhuma, e o README explica em 30
segundos o que é o protótipo e o que não é.

## 2. O que fica fora do protótipo

O jogo completo descrito no design inicial é grande demais para um protótipo. O
corte foi deliberado, e cada item cortado tem issue:

| Fora do protótipo | Motivo |
|---|---|
| Grade tática na batalha | Adicionada como melhoria sobre a tela lateral |
| Especialização de classe | Conteúdo de balanceamento, não de sistema |
| Tela de vestimenta | O efeito de equipar já existe dentro da bag |
| Ouro e economia | Uma tela e um número |
| Companheiros e grupo de 3 | Entra na próxima versão |
| Missão do acampamento com os 3 orcs | Missão inteira a mais |
| Goblins e orcs como espécies vilanas jogáveis | Entra com a missão do acampamento |
| Revelação da raça dos Halflings | Entra depois do grupo de 3 |
| Árvore de habilidades | O que a especialização vai consumir |
| Save entre sessões | O protótipo só salva o início da batalha |

## 3. História

O mundo tem quatro povos em guerra, e um quinto a ser revelado.

- **Reino má:** Orcs, sob o comando de um mártir renascido.
- **Aliados:** Humanos, Elfos e Anões. Nenhum dos três aguenta o mártir sozinho,
  e é por aritmética que se aliam, não por bondade.
- **Vassalos:** Goblins, obrigados a servir os Orcs.
- **A serem revelados:** Halflings, que são mecânicos e ajudam a destruir o
  mártir.

O mártir renasce, segundo uma profecia de 100 anos. Quem pode matá-lo é o
herói: filho bastardo, último da linhagem da primeira vida do mártir. É esse
parentesco, e não espada ou magia, que dá a ele a única vantagem que importa.

O herói não sabe de nada disso quando o jogo começa. Ele chega como mensageiro
de um reino vizinho, e é a caravana de elfos da resistência quem conta a
história. A revelação completa, a linhagem e a profecia, só sai no diálogo com
a Rainha Kassandra, no fim da missão.

**Por que isso e não uma guerra nuclear:** a primeira versão da ideia era uma
Terra média pós apocalíptica, com as raças nascidas de mutação. A ideia foi
descartada porque o cenário genérico de guerra nuclear não sustenta o jogo, e
porque o gancho mais forte do conjunto é a profecia e o parentesco, não a
origem das raças.

## 4. Loop do protótipo

```
criação, raça e classe -> diálogo da caravana -> viagem pelo mapa
       -> gatilho de proximidade -> batalha em turnos -> vitória, drop, 1 ponto
       -> viagem -> diálogo com a Rainha -> Continuar... (fim do protótipo)
```

Uma missão só. Sem mapa de missões, sem tela de hub, sem menu principal.

## 5. Criação de personagem

Primeiro requisito do jogo: o jogador escolhe raça e classe antes de qualquer
coisa.

- **Raças:** Humano, Elfo, Anão.
- **Classes:** Arqueiro, Mago, Cavaleiro.
- **Pontos de atributo:** 12 livres, distribuídos livremente.

### Fórmulas

| Derivado | Fórmula |
|---|---|
| Vida máxima | `50 + força × 8` |
| Ataque físico | `5 + força × 2` |
| Ataque à distância | `4 + agilidade × 2` |
| Dano mágico | `6 + inteligência × 3` |
| Mana máxima | `20 + inteligência × 5` |
| Regeneração de mana | `1 × inteligência` por segundo |
| Velocidade de movimento | `2 + agilidade ÷ 3` tiles por segundo |

A velocidade mede o quanto o personagem anda no mapa, e não a ordem dos turnos.
Agilidade é a resposta: força é peso, inteligencia é poder, e o que faz o
personagem ser ágil no mundo é o reflexo. Montarias vão aumentar esse derivado
depois, o que dá um lugar natural para elas.

Força aumenta vida e ataque físico. Agilidade aumenta ataque de longo alcance e
velocidade de movimento. Inteligência aumenta dano mágico, mana e regeneração de
mana.

### Controles

| Tecla | O que faz |
|---|---|
| `A` | um passo para a esquerda |
| `W` | um passo para frente, que é para cima |
| `S` | um passo para trás, que é para baixo |
| `D` | um passo para a direita |
| `E` | interagir com o que está ao alcance |
| setas | escolher alvo na batalha, e escolher item no menu |
| `Enter` ou `Espaço` | confirmar a escolha |
| `Esc` | fechar o menu, ou sair do diálogo |

### Especialização, para o futuro

Nenhuma no protótipo. O caminho fica documentado, e a árvore de habilidades vai
consumir isso:

| Classe | Especializações previstas |
|---|---|
| Mago | Arquimago, Necromante |
| Cavaleiro | Paladino, Guarda Real |
| Arqueiro | Caçador, Bardo |

## 6. Itens e drop

Catálogo de 6 itens. Cada um soma de 1 a 3 em um atributo, ou vida, ou mana.

Mais 3 consumíveis, que não equipam e somem quando usados:

| Consumível | Cura | Origem |
|---|---|---|
| Pão de viagem | 10 | drop de goblin |
| Gota de mel | 5 | drop de goblin |
| Sopa de raiz | 20 | NPCs que vendem, no futuro |

- O drop é aleatório, com chance por inimigo.
- Equipar é feito dentro da bag, sem tela separada de vestimenta.
- Item equipado soma atributo e, por isso, muda os derivados.
- Não há ouro no protótipo.

Todo sorteio passa por um gerador de número aleatório recebido por parâmetro.
O jogo usa `Math.random`, os testes usam uma semente fixa. É o que faz o drop
ser testável sem chute.

### Loot no chão

O drop **não vai direto para a bag**. Cada inimigo derrotado deixa o item no
chão, na posição em que caiu, e o herói pega com `E` quando chega perto. Isso
transforma a vitória em uma pequena decisão: vale o risco de andar até o loot?

- O item fica visível no chão até ser pego.
- Pegar o loot é a única forma de levar o item para a bag.
- Consumível só pode ser usado em batalha, e sai da bag ao ser usado.
- Item de atributo vai para a bag e pode ser equipado depois.

## 7. Exploração

- **Mapa:** um único mapa contínuo, da fronteira até a cidade. Sem loading.
- **Câmera:** o personagem fica no centro e o mundo se move com o comando.
- **Colisão:** tile sólido contra o jogador, sem engine de física e sem
  pathfinding.
- **Movimento:** `A`, `W`, `S` e `D`, com passos de um tile, sem aceleração. A
  velocidade do personagem é a distância em tiles por segundo quando o jogador
  segura a tecla, e um passo por tecla pressionada quando é um toque.
- **Goblins:** 2 grupos de 2 goblins, em pontos diferentes do mapa. Cada goblin
  tem um ponto fixo, anda em volta dele num raio de 3 tiles, com pausas, e nunca
  sai desse raio. Nenhum goblin persegue o jogador.
- **Ritmo do mundo:** vagar é contado em tick, não em segundo. A regra não lê o
  relógio, porque relógio no meio da regra quebra o teste, então quem desenha
  chama `passarTempo` 6 vezes por segundo. Um tick move no máximo um tile, e o
  goblin pausa depois de cada passo.
- **Gatilho de batalha:** raio de 24 pixels entre herói e goblin.
- **Interação:** `E` é o único botão de interação, e ele serve para as 3 coisas
  que o protótipo tem: pegar loot no chão, abrir e avançar diálogo de NPC, e
  abrir a loja de quem vende. Uma tecla só, porque o jogo é pequeno e o número
  de coisas que se pode tocar é pequeno.
- **Prioridade da interação:** quando tem mais de uma coisa ao alcance, o NPC
  ganha do loot, e o loot mais próximo ganha dos outros. Interação sem alvo
  mostra "Não há nada aqui", e não faz nada.
- **Minimapa:** quadrado de 160 pixels no canto superior direito, com 16 pixels
  de margem, sem encostar na borda. Mostra o herói e a marca do objetivo.
  Clicar define um destino, e o herói anda direto, escorregando na parede.
- **Vida no mapa:** 1 ponto por segundo para cada personagem, fora de batalha.
- **Depois de fugir ou de vencer:** o goblin do grupo é empurrado para longe do
  herói, até 6 tiles do ponto fixo, para não haver reencontro automático assim
  que a tela de batalha fecha. O herói fica onde está.

## 8. Batalha

Tela lateral, no estilo de RPG clássico de turns. Sem grade, sem d20, sem
tempo real.

- **Cenário:** imagem fixa do local da batalha, jogador à esquerda, inimigos à
  direita. Sem tela de load, só um fade de 0,3s, porque a imagem é fixa e não
  há nada carregando.
- **Ordem:** lado fixo. O herói age primeiro, depois cada inimigo na ordem em que
  entraram em campo. Uma volta é um ciclo completo, e a ordem não muda dentro da
  batalha. A velocidade **não** participa da ordem, porque o protótipo tem um herói
  e 2 goblins, e com esse número o recurso que cria tensão é a vida, a mana e o
  item, não a vez de falar. Se o número de inimigos crescer, a issue da grade
  tática é o lugar de rever isso.
- **Fila de turnos:** barra no topo com o retrato de cada participante. Quem está
  agindo fica com a borda acesa e um pulso leve, quem já agiu na volta atual fica
  apagado, e quem morreu some da fila na hora.
- **Barras:** barra de vida e número de vida e de mana acima da cabeça de cada
  personagem envolvido. Mana só aparece no mago.
- **Ações:** atacar, habilidade (custa mana), usar item (consumível de cura),
  defender e fugir.
- **Caixa de opções:** no turno do jogador, abre uma caixa com as 4 ações
  disponíveis. Só aparece ação que pode ser usada agora, então habilidade sem
  mana não aparece, e item só aparece se tiver consumível na bag.
- **Escolha de alvo:** depois de escolher atacar, habilidade ou item, as setas
  trocam o alvo. Um círculo no chão marca o alvo selecionado, que é o que
  transforma o alvo em algo visível e não só em texto.
- **Dano:** valor base mais ou menos 20 por cento, arredondado. Sem dado, a
  variação vem do atributo e do item.
- **Mana:** sem mana, a habilidade fica indisponível.
- **Defender:** dá redução de dano de metade e 25 por cento de chance de
  esquiva contra o próximo ataque inimigo, e o efeito dura só até o próximo turno
  da própria unidade. No fim do turno seguinte da unidade, a defesa e a esquiva
  somem sozinhas.
- **Fuga:** disponível enquanto o herói está vivo. Pergunta "Deseja fugir?" antes
  do primeiro personagem morrer. Ao fugir, o herói sai da batalha e o goblin do
  grupo é empurrado para longe dele.
- **Derrota:** vida do herói em zero abre uma janela com duas opções: reiniciar
  a batalha, que carrega o snapshot do início dela, ou desistir, que mostra
  "Você foi derrotado" por 5 segundos e volta para a criação de personagem.
- **Vitória:** 1 ponto de atributo livre para o jogador escolher ao voltar ao
  mapa, e o drop de cada goblin deixado no chão, para ser pego com `E`.

### Save

Snapshot no início de cada batalha: posição, vida, mana, atributos, itens
equipados e fase da missão. Guardado em memória e em `localStorage`, para o botão
de reiniciar ser instantâneo e o F5 não quebrar o estado.

O save é **entrada não confiável**, porque `localStorage` é do navegador e o
jogador mexe. Três defesas, sem biblioteca de schema:

1. Limite de 4 KiB antes do `JSON.parse`, porque parsear payload enorme trava.
2.só `JSON.parse`. O snapshot inteiro é conferido campo a campo em
   `src/game/validacao.ts`: versão, fase, identificadores, unidades, atributos e
   vida dentro dos limites. Qualquer coisa fora é recusada e o jogo abre do
   começo.
3. A chave `__proto__` nunca é copiada para dentro de objeto novo, para não haver
   prototype pollution.

O save é do protótipo, e o contador de versão existe para que uma mudança de
formato invalide os snapshots antigos em vez de tentar adivinhar.

## 9. Missão 1, roteiro

1. **Chegada.** O herói aparece na fronteira, sem saber de nada. Um guarda ou
   um mapa na entrada sugere o caminho.
2. **Caravana.** A caravana de elfos da resistência está no caminho e conta a
   história: a guerra, o mártir que vai renascer, e que o reino vizinho mandou
   um mensageiro. É ela que dá a missão: chegar até a Rainha Kassandra.
3. **Viagem.** O jogador escolhe o grupo de goblins que vai enfrentar. O caminho
   é livre e o minimapa marca o objetivo.
4. **Batalha.** O herói sozinho contra 2 goblins.
5. **Retorno.** Drops, 1 ponto de atributo, e a vida regenera.
6. **Cidade.** Diálogo com a Rainha Kassandra. Ela abre a mensagem. O jogador
   descobre que é filho bastardo do mártir, último da linhagem, e que a profecia
   de 100 anos diz que só ele pode matar a reencarnação.
7. **Continuar...** Tela final, com o que vem na próxima versão. Os dois
   companheiros, o grupo de 3 e a missão do acampamento são o que vem depois.

O texto dos diálogos vive em `src/game/dialogos.ts`, como dado, e não como
código, para o texto ser editável sem tocar em lógica.

## 10. Arquitetura

### Stack, conferida no registro do npm em 2026-09-30

| Ferramenta | Versão | Papel |
|---|---|---|
| PixiJS | 8.21.0 | desenho do mundo |
| React | 19.3.0 | telas em DOM por cima do canvas |
| Vite | 8.3.1 | build e dev server |
| TypeScript | 6.0.3 | tipos, modo estrito |
| Vitest | 5.0.2 | teste das regras, sem navegador |
| oxlint | 1.81.0 | lint |

O `@pixi/react` não é usado. O mundo é desenhado pelo nosso código e o React
cuida só das telas em DOM, então a ponte seria dependência sem serviço.

### A regra que organiza o projeto

O código do jogo não sabe que Pixi e React existem. Tudo que é regra fica em
`src/game/`, em TypeScript puro, sem importar nada gráfico. A camada de render
lê o estado e desenha, e a de interface lê o estado e mostra. Fluxo em uma
direção só.

Isso é o que permite testar a batalha inteira sem abrir navegador, e é o que
roda no CI.

### Módulos

| Arquivo | Responsabilidade |
|---|---|
| `src/game/tipos.ts` | os tipos do domínio, sem comportamento |
| `src/game/random.ts` | gerador de número aleatório injetável, com semente |
| `src/game/atributos.ts` | converte pontos em derivados, e soma os itens |
| `src/game/itens.ts` | catálogo, drop, efeito de equipar |
| `src/game/combate.ts` | ordem de turnos, ações, dano, fuga, vitória, derrota |
| `src/game/mapa.ts` | tiles, colisão, vagar dos goblins, gatilho de proximidade |
| `src/game/mundo.ts` | mapa explorável, NPCs, goblins, loot e interação |
| `src/game/missoes.ts` | máquina de estados da missão |
| `src/game/dialogos.ts` | textos como dado |
| `src/game/validacao.ts` | o que o save precisa ter para ser aceito |
| `src/game/save.ts` | snapshot do início da batalha |
| `src/game/estado.ts` | store tipado, com reducer |
| `src/render/` | Pixi: cena, mundo, câmera, jogador, NPCs, fade |
| `src/ui/` | React: CriacaoPersonagem, Bag, Dialogo, Batalha, Minimapa, HUD, Continuar |

## 11. Arte e licença

Toda a arte é do **LPC, Liberated Pixel Cup**, pelo gerador universal de
spritesheet. É o único conjunto livre que tem as três raças jogáveis, as três
classes e os dois inimigos, com animação de combate, no mesmo estilo.

- Gerador: https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/
- Assets base e tiles: https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles

A licença é CC-BY-SA 3.0 e GPL 3.0. Isso obriga duas coisas:

1. Um arquivo de crédito com autor, licença e origem de cada imagem usada.
2. Derivações de arte continuam sob CC-BY-SA.

Por isso a arte **não vai para o git**. O repositório versiona o código sob MIT,
e `docs/ARTE.md` explica como gerar os sprites e o que precisa ser creditado.
Misturar arte CC-BY-SA dentro do repositório contaminaria o código.

A interface não usa sprite: barra de vida, caixa de diálogo, bag e moldura do
minimapa são CSS. Então a UI é o menor dos problemas.

## 12. Testes e CI

Vitest cobre só `src/game/`, porque só `src/game/` é testável sem navegador:

- fórmulas de atributo, com e sem item equipado
- drop com semente fixa, incluindo a série que prova que a semente importa
- ordem de turnos, com o herói primeiro e o ciclo completo
- dano, defesa, esquiva e mana insuficiente
- consumível na batalha, tirando um da bag por uso
- vitória, derrota, fuga e reinício a partir do snapshot
- loot no chão, diálogo de NPC, prioridade da interação e gatilho de batalha
- colisão de tile, movimento fluido, raio de vagar e ritmo em tick
- save adulterado, em `seguranca.test.ts`: versão, campos fora da tabela, vida
  acima do máximo, `__proto__` e payload grande

CI no GitHub Actions a cada push: `npm ci`, `npm test`, `npm run typecheck` e
`npm run lint`.

## 13. Riscos

| Risco | Plano |
|---|---|
| TypeScript 6 e o tooling novo do Vite 8 dá problema | Já é a versão que o template oficial do Vite fixou. Se quebrar, cai para a 5.9 |
| Bagunçar a fronteira entre regra e desenho e o teste exigir navegador | A regra é `src/game/` não importa nada de `render` nem de `ui`, e o lint protege |
| A arte CC-BY-SA virar dúvida de licença | Arte fora do git, `docs/ARTE.md` com o procedimento e a lista de créditos |
| O protótipo crescer de novo | Cada item novo nasce como issue antes de virar código |

## 14. Roadmap

Ordem de implementação depois do protótipo, e cada uma já existe como issue:

1. Grupo de 3, com IA de aliado e a cena da Rainha formando o time
2. Especialização de classe, consumindo a árvore de habilidades
3. Grade tática como evolução da tela lateral
4. Missão do acampamento: 3 orcs de classe distinta, mais os goblins de apoio
5. Tela de vestimenta e ouro
6. Revelação dos Halflings, com a classe de Mecânicos
7. Save entre sessões
