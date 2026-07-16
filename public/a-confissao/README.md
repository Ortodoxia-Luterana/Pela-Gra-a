# A Confissão — Caminhos da Reforma

Jogo narrativo mobile-first de decisões binárias por arraste, integrado ao login e ao sistema de medalhas do Game Hub.

A campanha ampliada possui **90 cartas**, **39 finais** e **40 registros históricos** no códice.

## Princípio de jogo

- O gesto de arrastar revela as duas respostas antes de confirmar.
- Cada carta parte de uma cidade ou lugar concreto, apresenta quem está ali, o que acabou de acontecer e o que está em risco antes de fazer a pergunta.
- Depois da escolha, uma nota curta explica o que aconteceu historicamente.
- As cartas alternam decisões históricas, consequências, encontros com personagens e rumores que correm pelas prensas.
- O lado da resposta histórica é sorteado de novo em cada jornada e permanece salvo durante aquela partida, sem sequência fixa ou alternância previsível.
- Não há equilíbrio artificial entre facções. `Escritura`, `Confissão` e `Testemunho` registram o que o jogador aprendeu.
- `Consciência`, `Proteção`, `Império`, `Igreja` e `Povo` mostram a pressão acumulada pelas decisões. Eles mudam consequências e podem abrir finais de colapso, mas não substituem a linha histórica como objetivo.
- A vitória exige atravessar a linha histórica principal; desvios abrem finais alternativos e registros no códice.
- Escolhas menores podem manter o acontecimento histórico e alterar seus custos. Decisões centrais ainda podem interromper imediatamente a Reforma.
- A campanha muda de protagonista coletivo depois da morte de Lutero em 1546. A segunda geração acompanha o Interim, as controvérsias, a Fórmula e o Livro de Concórdia; o epílogo chega à Boêmia e a 1648.

## Integração

- Rota: `/a-confissao`
- Persistência: `/api/a-confissao/save`
- Tabela SQLite: `reforma_saves`
- Identificador: `a-confissao`
- O arquivo `game.js` funciona em modo de prévia via `file://`, usando `localStorage`; no host, usa exclusivamente o perfil autenticado.

## Fontes históricas consultadas

- [Luther.de — infância e juventude](https://www.luther.de/en/geburt.html)
- [Cidade de Worms — biografia de Lutero](https://www.worms.de/en/web/luther/Worms_1521/Reichstag/Biografie_Luther.php)
- [Luther House, Wittenberg](https://www.wittenberg.de/portal/seiten/lutherhaus-i-luther-house-900000260-36670.html)
- [The Book of Concord — história do Livro de Concórdia](https://thebookofconcord.org/introductory-materials/historical-introductions/the-book-of-concord/)
- [LCMS — como surgiu a Fórmula de Concórdia](https://resources.lcms.org/reading-study/how-the-formula-of-concord-came-to-be/)
- [LCMS — o Interim de Augsburgo](https://resources.lcms.org/history/the-augsburg-interim/)
- [Oxford Academic — repressão e exílio após a Montanha Branca](https://academic.oup.com/ehr/article-abstract/CXXV/513/434/525519)

## Arte

As seis ilustrações históricas foram produzidas por geração de imagem especificamente para o jogo, em direção de gravura renascentista colorizada. A juventude e o período no mosteiro têm cenas próprias para acompanhar a idade de Lutero. Texto, controles, HUD e opções permanecem em HTML/CSS para preservar leitura e acessibilidade.
