# Uno Luterano

Jogo original de descarte em tempo real para o Hub Pela Graça, com identidade visual luterana e regras de mesa próprias.

## Mesas

- Três mesas públicas para 2 jogadores.
- Duas mesas públicas para 4 jogadores.
- A rodada começa automaticamente apenas quando todos os lugares estão ocupados.
- Jogadores conectados podem entrar direto, convidar e aceitar convites dentro do jogo.
- A prévia local pode completar qualquer mesa com bots para teste sem login e sem outra pessoa online.

## Baralho

O baralho tem 108 cartas:

- 76 cartas numéricas: um zero e duas cópias de 1 a 9 em cada uma das quatro cores.
- 8 cartas `+2`, 8 `Pular` e 8 `Inverter`.
- 4 coringas que escolhem a próxima cor.
- 4 coringas `+4` multicoloridos que também escolhem a próxima cor.

Cada jogador começa com sete cartas. É possível jogar por cor, número ou símbolo.

## Regras da casa

- Números iguais podem ser baixados em sequência na mesma jogada, mesmo em cores diferentes, desde que a primeira carta seja legal.
- `+2` e `+4` podem ser empilhados entre si em qualquer ordem.
- A compra acumulada só termina quando o jogador da vez não responde com outro `+2` ou `+4`.
- O `+4` sempre exige a escolha da próxima cor.

O servidor é a fonte de verdade para baralho, mãos, turno, validação e pontuação. O cliente recebe apenas a própria mão e a quantidade de cartas dos oponentes.

## Desenvolvimento

```powershell
python tools/process-cores-da-rosa-cards.py
npm run build:cores-da-rosa
npx tsc --noEmit -p games/cores-da-rosa/tsconfig.json
npm run test:cores-da-rosa
npm run preview:cores-da-rosa
```

A prévia abre em `http://localhost:3339/cores-da-rosa?localPlayer=1` sem login. Entre em uma mesa e use **Jogar agora contra bots**.

O ambiente gerado fica em `public/assets/environment`. As faces das cartas são construídas deterministicamente com HTML, CSS e SVG para preservar números, símbolos e quatro quadrantes iguais nos coringas.
