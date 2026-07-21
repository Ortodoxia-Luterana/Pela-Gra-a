# Lutheran Idle

Vertical slice do idle tycoon de congregação integrado ao ecossistema Pela Graça.

## Arquitetura

- Phaser 3 e TypeScript para a sala 2.5D, estações e personagens.
- HUD em DOM responsivo para celular e desktop.
- API autoritativa em `lutheran-idle-server.js`, com persistência SQLite normalizada.
- Sessão compartilhada `cultivando_session` e lançamento assinado específico do jogo.
- Socket.IO no namespace `/lutheran-idle` para presença e atualizações de distrito.
- Ações econômicas idempotentes por `actionId`, incluindo coleta e recompensa offline.

## Conteúdo do vertical slice

- sala inicial com altar, púlpito, bancos e entrada;
- visitantes e pastor animados em rotas que não atravessam os móveis;
- coleta, melhorias, recepção, catequese e alocação de trabalhadores;
- tutorial, missões, progresso offline, ranking e distrito cooperativo;
- save vinculado à conta do Hub.

## Desenvolvimento

```bash
npm run build:lutheran-idle
npm run test:lutheran-idle
npm run test:lutheran-idle:preview
npx tsc --noEmit -p games/lutheran-idle/tsconfig.json
```

Para abrir uma prévia local persistente sem tela de login:

```bash
npm run preview:lutheran-idle
```

Depois, acesse `http://localhost:3338/lutheran-idle`. O atalho sem login só é ativado para conexões de loopback e quando `LUTHERAN_IDLE_LOCAL_PREVIEW=1` está definido pelo script de prévia.

Os arquivos finais do jogo são publicados em `public/lutheran-idle`. As artes originais ficam em `art-source`; o script `tools/process-lutheran-assets.py` normaliza e recorta os recursos usados pelo Phaser.
