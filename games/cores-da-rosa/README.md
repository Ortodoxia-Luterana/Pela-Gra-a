# Cores da Rosa

Jogo original de descarte em tempo real para o Hub Pela Graça.

## Mesas

- Três mesas públicas para 2 jogadores.
- Duas mesas públicas para 4 jogadores.
- A rodada começa automaticamente apenas quando todos os lugares estão ocupados.
- Jogadores conectados podem entrar direto, convidar e aceitar convites dentro do jogo.

## Regras

A mão inicial tem seis cartas. É possível jogar por cor, número ou símbolo. `Cântico` segura uma vez, `Procissão` muda a direção, `Partilha` entrega duas cartas, `Rosa Livre` escolhe a cor e `Concílio` dá uma carta aos demais e também escolhe a cor.

O servidor é a fonte de verdade para baralho, mãos, turno, validação e pontuação. O cliente recebe apenas a própria mão e a quantidade de cartas dos oponentes.

## Desenvolvimento

```powershell
npm run build:cores-da-rosa
npx tsc --noEmit -p games/cores-da-rosa/tsconfig.json
npm run test:cores-da-rosa
npm run preview:cores-da-rosa
```

A prévia abre em `http://localhost:3339/cores-da-rosa` sem login. Para testar pessoas diferentes, abra contextos privados separados com `?localPlayer=1`, `?localPlayer=2`, `?localPlayer=3` e `?localPlayer=4`.

As artes finais ficam em `public/assets/cards`. A folha original gerada fica em `art-source`; `tools/process-cores-da-rosa-cards.py` recorta as seis cartas.
