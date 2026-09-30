---
name: rodar-endless
description: Use quando for rodar, testar, buildar ou depurar o Endless, e quando um teste ou o typecheck falhar. Contém os comandos, os pré requisitos, o que a arte exige antes do jogo abrir e o diagnóstico dos erros mais comuns.
---

# Rodar o Endless

## Pré requisitos

- Node 24. O `.nvmrc` está versionado, então `nvm use` resolve.
- A arte gerada em `public/assets/`, se você for olhar o jogo rodando. Sem
  arte, o jogo abre e roda com as primitivas de fallback, sem quebrar.

## Comandos

```bash
npm install
npm run dev        # dev server, mostra o endereço no terminal
npm test           # testes das regras, uma passada, sem watch
npm run test:watch # testes em modo watch
npm run typecheck  # tsc sem emitir nada
npm run lint       # oxlint
npm run build      # build de produção em dist/
npm run preview    # serve dist/ na porta padrão do preview
```

## O que o CI exige

Os três precisam passar antes do merge: `npm test`, `npm run typecheck` e
`npm run lint`. Se você escreve código e o CI ficou vermelho, rode os três
localmente antes de abrir o PR de novo.

## Onde os testes ficam

Só em `src/game/`, no padrão `src/game/__tests__/nome.test.ts`. Um teste de
`render` ou de `ui` é sinal de que a regra vazou para fora de `src/game/`, e o
conserto é mover a regra, não reescrever o teste com jsdom.

## Diagnóstico

| Sintoma | Causa provável |
|---|---|
| `Cannot find module 'vitest'` | `npm install` rodado com Node antigo, ou `node_modules` de outro projeto |
| `tsc` reclama de `process` ou de `import.meta` | `types` do `tsconfig.node.json` não tem `node`, mas ele tem |
| Teste de drop falha sozinho | Alguém chamou `Math.random` em vez do gerador injetado em `src/game/random.ts` |
| Teste de ordem de turnos falha | Empate sem desempate estável por identificador |
| O jogo abre em branco | Erro no boot do Pixi. Olhe o console do navegador, o erro real aparece lá |
| `npm run build` passa e o preview quebra | Faltou declarar um arquivo novo no `tsconfig.app.json`, ou o `include` não cobre o caminho |

## Antes de abrir PR

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

Se os quatro passarem, o PR está pronto.
