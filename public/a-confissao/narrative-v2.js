(() => {
  'use strict';

  const ending = (title, body, fact, art = 'exile', win = false) => ({ ending: true, title, body, fact, art, win });

  window.A_CONFISSAO_NARRATIVE_V2 = {
    codex: [
      { id:'eisleben', group:'Vida de Lutero', year:'1483', title:'Eisleben e Mansfeld', text:'Martinho nasceu em Eisleben em 10 de novembro de 1483. No dia seguinte foi batizado. Pouco depois, sua família foi para Mansfeld, cidade de minas de cobre.' },
      { id:'schools', group:'Vida de Lutero', year:'1497–1501', title:'Magdeburgo, Eisenach e Erfurt', text:'Martinho estudou em três cidades. Em Magdeburgo viveu com pouco dinheiro. Em Eisenach recebeu ajuda de amigos. Em Erfurt entrou numa das melhores universidades alemãs.' },
      { id:'storm', group:'Vida de Lutero', year:'1505', title:'A tempestade de Stotternheim', text:'Voltando para Erfurt, Martinho foi cercado por uma tempestade. Com medo de morrer, prometeu entrar no mosteiro. Duas semanas depois cumpriu a promessa.' },
      { id:'rome', group:'Vida de Lutero', year:'1510/11', title:'A viagem a Roma', text:'Lutero foi a Roma a serviço de sua ordem. Viu igrejas, relíquias e muitos peregrinos, mas também encontrou pressa e comércio onde esperava cuidado com a fé.' },
      { id:'doctorate', group:'Vida de Lutero', year:'1512', title:'Doutor da Bíblia', text:'Em Wittenberg, Lutero tornou-se doutor em teologia. Sua tarefa era estudar a Bíblia e ensiná-la em público.' },
      { id:'theses', group:'Reforma', year:'1517', title:'As 95 Teses', text:'Lutero enviou as teses ao arcebispo Alberto de Mainz em 31 de outubro. A famosa cena da porta da igreja pode ter acontecido, mas os historiadores ainda discutem esse detalhe.' },
      { id:'cajetan', group:'Reforma', year:'1518', title:'Augsburgo', text:'O cardeal Caetano pediu que Lutero voltasse atrás. Lutero pediu que mostrassem seu erro usando a Bíblia. Como isso não aconteceu, deixou a cidade em segredo.' },
      { id:'leipzig', group:'Reforma', year:'1519', title:'O debate de Leipzig', text:'Johann Eck levou Lutero a uma pergunta maior: papas e concílios podem errar? Lutero respondeu que a Bíblia está acima de todos eles.' },
      { id:'treatises', group:'Reforma', year:'1520', title:'A prensa de Wittenberg', text:'Em 1520, três livros levaram o debate para toda a Alemanha. Eles falaram de autoridade, sacramentos e liberdade cristã.' },
      { id:'worms', group:'Reforma', year:'1521', title:'A Dieta de Worms', text:'Diante do imperador Carlos V, Lutero reconheceu seus livros. Disse que só voltaria atrás se fosse convencido pela Bíblia e por razões claras.' },
      { id:'wartburg', group:'Reforma', year:'1521–1522', title:'O castelo de Wartburg', text:'Amigos esconderam Lutero no castelo. Com barba e outro nome, ele passou a ser chamado de Cavaleiro Jorge e traduziu o Novo Testamento para o alemão.' },
      { id:'invocavit', group:'Reforma', year:'1522', title:'De volta a Wittenberg', text:'Alguns queriam mudar tudo pela força. Lutero saiu do esconderijo e pregou por oito dias. Pediu ensino paciente, sem violência.' },
      { id:'marriage', group:'Casa de Lutero', year:'1525', title:'Katharina von Bora', text:'Lutero casou-se com Katharina, uma ex-freira. A casa dos dois recebeu crianças, estudantes, refugiados e muitas conversas ao redor da mesa.' },
      { id:'catechisms', group:'Confissões', year:'1529', title:'Catecismos para casa', text:'Ao visitar vilas, Lutero percebeu que muita gente não conhecia nem o Pai-Nosso. Escreveu dois catecismos: um curto para famílias e outro maior para professores e pastores.' },
      { id:'marburg', group:'Confissões', year:'1529', title:'A mesa de Marburgo', text:'Lutero e Zwinglio concordaram em muitos assuntos, mas não na Ceia. Lutero insistiu que Cristo realmente dá seu corpo e sangue no pão e no vinho.' },
      { id:'augsburg', group:'Confissões', year:'1530', title:'Confissão de Augsburgo', text:'Lutero não podia entrar em Augsburgo porque estava fora da lei. De Coburgo, enviou cartas. Melanchthon apresentou a confissão ao imperador.' },
      { id:'bible', group:'Confissões', year:'1534', title:'A Bíblia alemã', text:'A Bíblia completa saiu em 1534. Lutero não trabalhou sozinho: especialistas em grego, hebraico e língua alemã ajudaram na revisão.' },
      { id:'magdalena', group:'Casa de Lutero', year:'1542', title:'A morte de Magdalena', text:'Magdalena, filha de Lutero e Katharina, morreu aos treze anos. A família chorou muito e falou de sua esperança na ressurreição.' },
      { id:'death', group:'Vida de Lutero', year:'1546', title:'O retorno a Eisleben', text:'Mesmo doente, Lutero foi a Eisleben para ajudar numa briga entre os condes de Mansfeld. Morreu ali em 18 de fevereiro de 1546.' },
      { id:'interim', group:'Depois de Lutero', year:'1546–1548', title:'Guerra e Interim', text:'Depois da derrota dos príncipes luteranos, o imperador tentou impor novas regras religiosas. Pastores que recusaram perderam igrejas, casas e tiveram de fugir.' },
      { id:'controversies', group:'Depois de Lutero', year:'1548–1577', title:'Brigas dentro da Reforma', text:'Sem Lutero, os próprios luteranos discutiram sobre fé, boas obras, vontade humana, pecado, Ceia e a pessoa de Cristo. A Fórmula de Concórdia respondeu a essas brigas.' },
      { id:'formula', group:'Livro de Concórdia', year:'1577', title:'Fórmula de Concórdia', text:'Seis teólogos compararam textos, ouviram críticas e revisaram cada artigo. O resultado teve uma parte curta e outra com explicações maiores.' },
      { id:'book', group:'Livro de Concórdia', year:'1580', title:'Livro de Concórdia', text:'O livro foi publicado em alemão em 25 de junho de 1580, cinquenta anos depois da Confissão de Augsburgo.' },
      { id:'bohemia', group:'Guerra e exílio', year:'1618–1621', title:'Praga e a Montanha Branca', text:'Uma revolta em Praga abriu a Guerra dos Trinta Anos. Depois da derrota de 1620, líderes foram mortos e muitas famílias tiveram de escolher entre mudar de fé ou deixar o país.' },
      { id:'westphalia', group:'Guerra e exílio', year:'1648', title:'Münster e Osnabrück', text:'A Paz de Vestfália terminou a guerra em 1648. Ela não devolveu tudo aos exilados, mas reconheceu mais de uma confissão cristã dentro do Império.' },
      { id:'sources', group:'Fontes', year:'Pesquisa', title:'Como a história foi montada', text:'A campanha usa biografias de Lutero, arquivos de Wittenberg e Worms, o Livro de Concórdia, materiais sobre o Interim e estudos sobre os exilados da Boêmia.' }
    ],

    endings: {
      law: ending('O caminho das minas','Martinho fica perto de Mansfeld e segue a vida que seu pai imaginou. Sem o mosteiro e sem Wittenberg, esta história da Reforma nunca começa.','Em 1505, Lutero deixou o curso de Direito e entrou no mosteiro contra a vontade do pai.','youth'),
      indulgence: ending('A pergunta fica calada','Os certificados continuam sendo vendidos, e ninguém de Wittenberg chama o assunto para debate. A Reforma termina antes de ganhar uma voz.','Em 1517, Lutero queria abrir uma discussão entre professores e pastores; ainda não planejava criar outra igreja.','reform'),
      cajetan: ending('Silêncio em Augsburgo','Você volta atrás sem ouvir uma resposta da Bíblia. O cardeal fecha o caso e Wittenberg perde sua voz.','Lutero saiu de Augsburgo em segredo depois de recusar uma volta atrás sem explicação.','reform'),
      leipzig: ending('O debate acaba cedo','Você foge da pergunta de Eck. Papas, concílios e Bíblia não são comparados, e o conflito perde sua força.','Em Leipzig, Lutero disse que concílios também podiam errar.','reform'),
      bull: ending('Os livros viram cinza','Você entrega seus textos e aceita a ameaça de Roma. As prensas param e a discussão termina.','A bula deu sessenta dias para Lutero voltar atrás. Ele respondeu queimando uma cópia da bula.','reform'),
      worms: ending('A voz se cala em Worms','Você volta atrás diante do imperador. Sai do salão vivo, mas a confissão pública termina ali.','Depois da recusa, o Édito de Worms declarou Lutero fora da lei.','reform'),
      road: ending('Morto na estrada','Sem o plano de proteção, homens do imperador encontram o fora da lei antes que ele volte a Wittenberg.','O falso sequestro foi organizado por aliados de Frederico, o Sábio.','reform'),
      radicals: ending('Wittenberg em chamas','Mudanças são feitas na força. A cidade entra em confusão, e a Reforma passa a ser vista como violência.','Nos sermões de 1522, Lutero pediu mudança pela Palavra, não pela força.','reform'),
      revolt: ending('Entre foices e espadas','Você entra na revolta como se toda violência fosse santa. O exército dos príncipes vence, e você morre com os camponeses.','Lutero criticou a opressão dos senhores e também a violência da revolta, embora tenha usado palavras muito duras.','reform'),
      marburg: ending('Um acordo de papel','Você esconde a diferença sobre a Ceia para conseguir uma aliança. O texto parece unir, mas a briga volta ainda maior.','Em Marburgo houve acordo em muitos pontos, mas não na presença de Cristo na Ceia.','reform'),
      interim: ending('O púlpito se rende','Você aceita as regras do imperador para conservar casa e cargo. A comunidade aprende que a fé pode ser trocada por segurança.','Muitos pastores que recusaram o Interim foram expulsos.','concord'),
      magdeburg: ending('As prensas se calam','A cidade fecha suas oficinas. Sem livros e panfletos, a resistência ao imperador perde sua voz.','Magdeburgo virou um dos grandes centros de impressão contra o Interim.','concord'),
      osiander: ending('O perdão fica confuso','Você ensina que Deus só aceita quem já mudou por dentro. Pessoas com medo passam a procurar valor em si mesmas, em vez da promessa de Cristo.','A Fórmula ensinou que o perdão depende do que Cristo fez, não de uma qualidade encontrada dentro de nós.','concord'),
      major: ending('Boas obras viram pagamento','A ajuda ao próximo deixa de ser fruto da fé e vira preço para comprar a salvação. O Evangelho perde sua gratuidade.','A Fórmula ensinou que boas obras são frutos da fé, mas não compram o perdão.','concord'),
      synergy: ending('Deus recebe um ajudante','Você diz que a pessoa precisa produzir a primeira parte da própria fé. Quem não consegue começa a pensar que Deus não fez o bastante.','A Fórmula ensinou que o Espírito cria a fé por meio da Palavra.','concord'),
      flacius: ending('A criação vira pecado','Você diz que o ser humano é feito da própria matéria do pecado. Já não sobra diferença entre a criação de Deus e o mal que a feriu.','A Fórmula separou a natureza criada por Deus da corrupção causada pelo pecado.','concord'),
      crypto: ending('Duas mensagens na mesma igreja','Você assina uma coisa e ensina outra em segredo. Quando a diferença aparece, ninguém sabe em quem confiar.','A briga em Dresden envolveu principalmente a Ceia e o ensino sobre Cristo.','concord'),
      formula: ending('A Concórdia não nasce','Cada grupo quer vencer sozinho. Ninguém ouve as críticas, as cidades continuam divididas e o livro nunca fica pronto.','A Fórmula nasceu de muitos encontros, visitas, cartas e revisões.','concord'),
      bohemia: ending('A praça das execuções','Você trata as armas como garantia da fé. Depois da derrota, é levado à Praça da Cidade Velha, em Praga, junto dos líderes condenados.','Vinte e sete líderes boêmios foram mortos em Praga em 1621.','exile'),
      conversion: ending('A casa fica, a memória se perde','Para conservar a propriedade, você abandona em público a confissão da família. Sobrevive, mas os livros e histórias deixam de passar aos filhos.','Em terras dos Habsburgo, muitos não católicos tiveram de mudar de fé ou partir.','exile'),
      victory: ending('A confissão permanece','Você percorreu 165 anos de estradas, salas, oficinas e cidades. Casas foram perdidas e pessoas morreram, mas a Palavra, os livros e a confissão seguiram viagem.','O Livro de Concórdia reuniu os principais textos da fé luterana, e famílias exiladas carregaram essa memória para outras terras.','exile',true)
    },

    cards: {
      birth:{place:'Eisleben → Mansfeld',speaker:'Hans e Margarethe olham o berço',prompt:'Os sinos de Eisleben anunciam um novo dia. Que futuro começa para Martinho?',context:'Hans trabalha com cobre e sonha com uma vida melhor para o filho.',lesson:'A família mudou-se para Mansfeld, uma cidade de minas. Ali Martinho passou a infância.',left:{label:'Mandá-lo cedo para as minas',end:'law'},right:{label:'Guardar dinheiro para a escola',next:'magdeburgSchool',mark:'scripture',codex:'eisleben'}},
      magdeburgSchool:{place:'Magdeburgo',speaker:'Martinho, 13 anos',prompt:'A cidade é fria, a comida é pouca e as aulas são longas. Martinho continua?',context:'Longe de casa, ele canta pelas ruas para conseguir pão.',lesson:'Martinho ficou em Magdeburgo e depois seguiu para Eisenach, onde encontrou ajuda e novos professores.',left:{label:'Aguentar e seguir estudando',next:'erfurt',mark:'scripture',codex:'schools'},right:{label:'Voltar para Mansfeld',end:'law'}},
      erfurt:{place:'Erfurt',speaker:'Portão da universidade',prompt:'Atrás das muralhas há livros, debates e estudantes de toda parte. Martinho entra?',context:'Seu pai espera vê-lo formado em Direito.',lesson:'Em Erfurt, Martinho estudou artes e começou o curso de Direito antes de mudar toda a sua vida.',left:{label:'Trabalhar com o pai',end:'law'},right:{label:'Entrar na universidade',next:'storm',mark:'scripture'}},
      storm:{place:'Stotternheim',speaker:'Uma estrada sob a tempestade',prompt:'Um raio cai perto e Martinho pensa que vai morrer. Ele cumprirá a promessa feita no medo?',context:'No chão molhado, promete entrar no mosteiro.',lesson:'Duas semanas depois da tempestade, Martinho entrou no mosteiro agostiniano de Erfurt.',left:{label:'Cumprir a promessa',next:'firstmass',mark:'witness',codex:'storm'},right:{label:'Voltar ao curso de Direito',end:'law'}},
      firstmass:{place:'Erfurt',speaker:'A capela do mosteiro',prompt:'Na primeira missa, suas mãos tremem diante do altar. Martinho foge ou termina?',context:'Ele teme estar perto de Deus e ainda não encontra paz.',lesson:'Martinho tornou-se padre, mas suas perguntas sobre culpa e perdão continuaram.',left:{label:'Largar o altar',end:'law'},right:{label:'Respirar e terminar a missa',next:'rome',mark:'scripture'}},
      rome:{place:'Roma',speaker:'Entre peregrinos e sinos',prompt:'A cidade santa está cheia de fé, pressa e comércio. O que Martinho fará com o que viu?',context:'Alguns padres correm pelas missas; peregrinos procuram perdão em cada relíquia.',lesson:'A viagem não acabou com sua fé. Ela fez Martinho observar com mais cuidado o que a Igreja ensinava e fazia.',left:{label:'Guardar as perguntas',next:'wittenberg',mark:'scripture',codex:'rome'},right:{label:'Fingir que nada aconteceu',end:'indulgence'}},
      wittenberg:{place:'Wittenberg',speaker:'Johann von Staupitz mostra a cidade',prompt:'Wittenberg é pequena, lamacenta e tem uma universidade nova. Martinho aceita ensinar ali?',context:'Staupitz acredita que estudar a Bíblia pode ajudá-lo e também ajudar outros.',lesson:'Wittenberg virou a cidade central da vida de Lutero e da Reforma.',left:{label:'Assumir a sala de aula',next:'doctorate',mark:'scripture'},right:{label:'Continuar escondido no mosteiro',end:'indulgence'}},
      doctorate:{place:'Wittenberg',speaker:'A universidade reunida',prompt:'O juramento de doutor obriga Martinho a ensinar a Bíblia em público. Ele aceita?',context:'Salmos, Romanos e Gálatas esperam sobre a mesa.',lesson:'Em 1512, Lutero tornou-se doutor e professor da Bíblia na Universidade de Wittenberg.',left:{label:'Recusar o juramento',end:'indulgence'},right:{label:'Ensinar a Bíblia',next:'romans',mark:'scripture',codex:'doctorate'}},
      romans:{place:'Wittenberg',speaker:'Uma lamparina sobre Romanos',prompt:'“O justo viverá por fé.” A justiça de Deus é só castigo ou também presente?',context:'Martinho lê a mesma frase muitas vezes e percebe uma nova porta no texto.',lesson:'Lutero passou a falar da justiça que Deus oferece gratuitamente por meio da fé.',left:{label:'Receber a justiça como presente',next:'tetzel',mark:'scripture'},right:{label:'Confiar nos próprios méritos',end:'indulgence'}},
      tetzel:{place:'Jüterbog, perto de Wittenberg',speaker:'A voz de Tetzel na praça',prompt:'Moedas caem no cofre enquanto certificados prometem aliviar penas. Martinho ficará calado?',context:'Moradores de Wittenberg atravessam a fronteira para comprar segurança para vivos e mortos.',lesson:'Lutero preparou perguntas sobre as indulgências e chamou professores para um debate.',left:{label:'Evitar problemas',end:'indulgence'},right:{label:'Preparar um debate',next:'theses',mark:'confession'}},
      theses:{place:'Wittenberg',speaker:'31 de outubro de 1517',prompt:'As 95 perguntas estão prontas. Elas ficam na gaveta ou entram na cidade?',context:'Uma carta pode chegar ao arcebispo; uma cópia pode chegar à universidade e às prensas.',lesson:'As teses foram copiadas, impressas e lidas em muitas cidades. Um debate local virou assunto da Europa.',left:{label:'Enviar e tornar públicas',next:'cajetan',mark:'confession',codex:'theses',achievement:'confissao-95-teses'},right:{label:'Trancar tudo na gaveta',end:'indulgence'}},
      cajetan:{place:'Augsburgo',speaker:'Cardeal Caetano aponta para Lutero',prompt:'“Volte atrás.” Mas ninguém mostrou onde a Bíblia o condena. O que Lutero responde?',context:'A sala é hostil, e amigos já planejam uma saída pela madrugada.',lesson:'Lutero não voltou atrás em Augsburgo e deixou a cidade em segredo para não ser preso.',left:{label:'Pedir uma resposta da Bíblia',next:'leipzig',mark:'confession',codex:'cajetan'},right:{label:'Aceitar sem explicação',end:'cajetan'}},
      leipzig:{place:'Leipzig',speaker:'Johann Eck diante do público',prompt:'Eck pergunta se papas e concílios podem errar. Lutero enfrenta a pergunta?',context:'O salão está cheio, e cada resposta leva o debate para mais longe.',lesson:'Em Leipzig, Lutero afirmou que até concílios podiam errar e colocou a Bíblia acima deles.',left:{label:'Fugir do assunto',end:'leipzig'},right:{label:'Responder com clareza',next:'treatises',mark:'scripture',codex:'leipzig'}},
      treatises:{place:'Wittenberg',speaker:'As prensas batem noite adentro',prompt:'O conflito já não é só sobre indulgências. Lutero falará de toda a reforma necessária?',context:'Três manuscritos aguardam tinta, papel e coragem.',lesson:'Os três livros de 1520 espalharam ideias sobre autoridade, sacramentos e liberdade cristã.',left:{label:'Publicar os três livros',next:'bull',mark:'confession',codex:'treatises'},right:{label:'Falar só das moedas',end:'bull'}},
      bull:{place:'Wittenberg',speaker:'Uma bula chega de Roma',prompt:'Restam sessenta dias para obedecer. Qual papel irá para o fogo?',context:'Estudantes se juntam fora dos muros para ver a resposta.',lesson:'Lutero queimou uma cópia da bula. Pouco depois foi excomungado.',left:{label:'Queimar os próprios livros',end:'bull'},right:{label:'Queimar a bula',next:'worms',mark:'witness'}},
      worms:{place:'Worms',speaker:'O imperador espera no salão',prompt:'Livros estão empilhados sobre a mesa. Lutero reconhecerá sua voz e ficará com ela?',context:'Príncipes, bispos e soldados observam cada movimento.',lesson:'Lutero recusou voltar atrás sem ser convencido pela Bíblia e por razões claras.',left:{label:'Ficar com o que escreveu',next:'road',mark:'confession',codex:'worms',achievement:'confissao-worms'},right:{label:'Negar tudo diante do imperador',end:'worms'}},
      road:{place:'Estrada de Worms',speaker:'Cavaleiros cercam a carruagem',prompt:'Homens mascarados puxam Lutero para a floresta. Ele confia no plano de seus amigos?',context:'O imperador o declarou fora da lei; desaparecer pode ser a única saída.',lesson:'O falso sequestro levou Lutero em segurança para o castelo de Wartburg.',left:{label:'Seguir sozinho para casa',end:'road'},right:{label:'Deixar os cavaleiros protegê-lo',next:'wartburg',mark:'witness'}},
      wartburg:{place:'Castelo de Wartburg',speaker:'O Cavaleiro Jorge fecha a porta',prompt:'Escondido e com outro nome, Lutero pode esperar ou trabalhar. O que faz?',context:'Um Novo Testamento em grego está aberto sobre a mesa.',lesson:'Em Wartburg, Lutero traduziu o Novo Testamento para um alemão que mais pessoas podiam entender.',left:{label:'Traduzir o Novo Testamento',next:'invocavit',mark:'scripture',codex:'wartburg',achievement:'confissao-wartburg'},right:{label:'Esperar sem escrever',end:'radicals'}},
      invocavit:{place:'Wittenberg',speaker:'A cidade está em confusão',prompt:'Imagens são quebradas e mudanças são impostas na força. Como Lutero responde?',context:'Voltar do esconderijo significa correr risco de prisão.',lesson:'Lutero voltou e pregou por oito dias. Pediu paciência, ensino e mudança sem violência.',left:{label:'Voltar e pregar',next:'hymns',mark:'witness',codex:'invocavit'},right:{label:'Apoiar a força nas ruas',end:'radicals'}},
      hymns:{place:'Wittenberg',speaker:'Uma melodia sai da oficina',prompt:'A fé ficará apenas nos livros ou também será cantada por crianças e trabalhadores?',context:'Palavras simples podem atravessar mercados, casas e escolas.',lesson:'Hinos em alemão ajudaram comunidades inteiras a aprender e guardar a fé.',left:{label:'Deixar o povo só ouvir',end:'radicals'},right:{label:'Escrever hinos para todos',next:'peasants',mark:'witness'}},
      peasants:{place:'Turíngia',speaker:'Fumaça sobe das aldeias',prompt:'Camponeses falam de liberdade; príncipes chegam com exércitos. Toda violência deve ser abençoada?',context:'Há injustiça verdadeira, mas também saque, medo e morte.',lesson:'Lutero criticou a opressão e a revolta, mas suas palavras contra os camponeses foram duras e continuam sendo discutidas.',left:{label:'Chamar toda revolta de santa',end:'revolt'},right:{label:'Condenar opressão e violência',next:'marriage',mark:'confession'}},
      marriage:{place:'Wittenberg',speaker:'Katharina bate à porta',prompt:'Um ex-monge e uma ex-freira podem formar uma casa diante de toda a cidade?',context:'A escolha será pessoal, mas também mostrará uma nova visão de família e trabalho pastoral.',lesson:'Lutero e Katharina se casaram em 1525. Sua casa virou abrigo, escola e lugar de conversa.',left:{label:'Esconder-se atrás da antiga imagem',end:'radicals'},right:{label:'Casar-se com Katharina',next:'visitations',mark:'witness',codex:'marriage'}},
      visitations:{place:'Vilas da Saxônia',speaker:'Uma família tenta recitar o Pai-Nosso',prompt:'Pastores e famílias quase não conhecem o básico. A resposta será castigo ou ensino?',context:'A Reforma chegou aos livros, mas ainda não chegou a muitas mesas.',lesson:'As visitas às igrejas levaram Lutero a preparar materiais simples para ensinar a fé.',left:{label:'Punir quem não sabe',end:'formula'},right:{label:'Criar um ensino simples',next:'catechisms',mark:'scripture'}},
      catechisms:{place:'Wittenberg',speaker:'Uma mesa de cozinha',prompt:'Quem deve aprender Mandamentos, Credo, Pai-Nosso, Batismo e Ceia?',context:'Pais, crianças, professores e pastores precisam falar a mesma língua.',lesson:'Em 1529 saíram o Catecismo Menor, para famílias, e o Maior, para quem ensinava.',left:{label:'Ensinar em casas e igrejas',next:'marburg',mark:'confession',codex:'catechisms'},right:{label:'Deixar apenas para doutores',end:'formula'}},
      marburg:{place:'Marburgo',speaker:'Uma frase escrita sobre a mesa',prompt:'“Isto é o meu corpo.” Vale esconder a diferença sobre a Ceia para ganhar uma aliança?',context:'Lutero e Zwinglio concordaram em quase tudo, menos aqui.',lesson:'O encontro terminou sem acordo sobre a Ceia. A união política não foi colocada acima do ensino confessado.',left:{label:'Assinar um texto vago',end:'marburg'},right:{label:'Dizer claramente o que crê',next:'augsburg',mark:'confession',codex:'marburg'}},
      augsburg:{place:'Coburgo → Augsburgo',speaker:'Mensageiros sobem a fortaleza',prompt:'Lutero não pode entrar em Augsburgo. Ele confiará a apresentação a Melanchthon?',context:'Cartas viajam entre a fortaleza e a cidade onde o imperador espera.',lesson:'Melanchthon apresentou a Confissão de Augsburgo em 25 de junho de 1530.',left:{label:'Apoiar Melanchthon por cartas',next:'bible',mark:'confession',codex:'augsburg'},right:{label:'Impedir a apresentação',end:'formula'}},
      bible:{place:'Wittenberg',speaker:'A oficina cheira a tinta',prompt:'A Bíblia completa precisa de muitas revisões. Lutero aceitará ajuda de outros estudiosos?',context:'Hebraico, grego e alemão se encontram sobre a mesma mesa.',lesson:'A Bíblia alemã completa foi publicada em 1534 como trabalho de uma equipe.',left:{label:'Revisar com a equipe',next:'smalcald',mark:'scripture',codex:'bible'},right:{label:'Tratar tudo como obra de um homem',end:'formula'}},
      smalcald:{place:'Esmalcalda',speaker:'Lutero escreve mesmo doente',prompt:'Se ele não chegar ao próximo concílio, quais pontos não podem ficar sem resposta?',context:'A febre cresce, e folhas em branco ainda esperam.',lesson:'Os Artigos de Esmalcalda registraram os pontos que Lutero considerava centrais e que não podia abandonar.',left:{label:'Deixar tudo sem resposta',end:'formula'},right:{label:'Escrever os artigos',next:'magdalena',mark:'confession'}},
      magdalena:{place:'Wittenberg',speaker:'O quarto fica em silêncio',prompt:'Magdalena morre nos braços do pai. Como a família atravessa essa noite?',context:'A fé não apaga o choro, e o choro não apaga a esperança.',lesson:'Lutero e Katharina choraram a filha e falaram de sua esperança de vê-la novamente.',left:{label:'Chorar e falar de esperança',next:'mansfeld',mark:'witness',codex:'magdalena'},right:{label:'Fingir que a dor não existe',end:'formula'}},
      mansfeld:{place:'Mansfeld',speaker:'Uma carta chama o velho professor',prompt:'Doente e cansado, Lutero viajará no inverno para separar uma briga entre condes?',context:'A última estrada o leva de volta à região onde cresceu.',lesson:'Lutero conseguiu ajudar no acordo e seguiu para Eisleben, sua cidade natal.',left:{label:'Recusar qualquer ajuda',end:'formula'},right:{label:'Viajar para fazer a paz',next:'death',mark:'witness'}},
      death:{place:'Eisleben',speaker:'18 de fevereiro de 1546',prompt:'A voz de Lutero se cala na cidade onde nasceu. O que a nova geração carregará?',context:'A Reforma agora depende de professores, pastores, famílias e cidades inteiras.',lesson:'Depois da morte de Lutero, seus seguidores precisaram resolver guerras e brigas internas sem transformá-lo numa relíquia.',left:{label:'Transformar Lutero em santo intocável',end:'formula'},right:{label:'Voltar à Bíblia e aos textos',next:'war',mark:'scripture',codex:'death'}},
      war:{place:'Mühlberg',speaker:'O exército luterano foi derrotado',prompt:'A espada do imperador venceu a batalha. Ela também pode decidir o que a igreja deve crer?',context:'Príncipes estão presos e cidades esperam as próximas ordens.',lesson:'A derrota de Mühlberg deu ao imperador força para pressionar os territórios luteranos.',left:{label:'Separar a fé da força militar',next:'interim',mark:'confession'},right:{label:'Deixar a espada escolher a doutrina',end:'interim'}},
      interim:{place:'Augsburgo',speaker:'O selo do imperador chega às igrejas',prompt:'Novas regras prometem paz, mas pedem que pastores abandonem partes da confissão. Eles aceitam?',context:'Recusar pode custar púlpito, casa e segurança.',lesson:'Pastores que recusaram o Interim foram afastados. Alguns fugiram com suas famílias e livros.',left:{label:'Aceitar para conservar o cargo',end:'interim'},right:{label:'Recusar e enfrentar o exílio',next:'magdeburg',mark:'witness',codex:'interim'}},
      magdeburg:{place:'Magdeburgo',speaker:'Canhões cercam as muralhas',prompt:'As prensas continuarão trabalhando enquanto a cidade resiste ao imperador?',context:'Papel e tinta viram armas de palavras dentro da cidade sitiada.',lesson:'Magdeburgo imprimiu muitos textos contra o Interim e ficou conhecida por sua resistência.',left:{label:'Manter as prensas vivas',next:'osiander',mark:'confession'},right:{label:'Fechar as oficinas',end:'magdeburg'}},
      osiander:{place:'Königsberg',speaker:'Uma discussão sobre o perdão',prompt:'Deus perdoa por causa do que Cristo fez ou porque encontra algo bom crescendo dentro de nós?',context:'A resposta muda onde uma pessoa com medo procura certeza.',lesson:'A resposta luterana colocou a segurança no que Cristo fez, não numa qualidade que precisamos encontrar dentro de nós.',left:{label:'Procurar a certeza dentro de nós',end:'osiander'},right:{label:'Confiar no que Cristo fez',next:'major',mark:'scripture'}},
      major:{place:'Wittenberg',speaker:'Professores discutem boas obras',prompt:'Ajudar o próximo é fruto da fé ou uma taxa para entrar no céu?',context:'Todos querem defender uma vida cristã ativa, mas as palavras podem esconder o Evangelho.',lesson:'A Concórdia ensinou que boas obras são necessárias como frutos da fé, mas não compram a salvação.',left:{label:'Chamar as obras de pagamento',end:'major'},right:{label:'Chamá-las de fruto da fé',next:'augsburgpeace',mark:'confession'}},
      augsburgpeace:{place:'Augsburgo',speaker:'Príncipes assinam a paz',prompt:'Cada governante poderá escolher a religião de seu território. Isso resolve todas as brigas?',context:'A guerra para por um tempo, mas as igrejas luteranas ainda discordam entre si.',lesson:'A Paz de Augsburgo reconheceu territórios luteranos, mas não resolveu as discussões dentro da Reforma.',left:{label:'Usar a paz para conversar',next:'synergy',mark:'witness'},right:{label:'Fingir que tudo foi resolvido',end:'formula'}},
      synergy:{place:'Jena',speaker:'Uma aula sobre o começo da fé',prompt:'Quando alguém passa a crer, Deus começa sozinho ou espera a pessoa dar o primeiro passo?',context:'A pergunta parece pequena, mas muda a ideia de graça.',lesson:'A Fórmula ensinou que o Espírito cria a fé por meio da Palavra, sem esperar uma força espiritual própria da pessoa.',left:{label:'Dar o primeiro passo ao ser humano',end:'synergy'},right:{label:'Dar o começo ao Espírito',next:'flacius',mark:'scripture'}},
      flacius:{place:'Weimar',speaker:'A briga chega ao pecado original',prompt:'O pecado feriu profundamente a criação de Deus ou virou a própria matéria do ser humano?',context:'Se não houver diferença, tudo o que Deus criou passa a ser chamado de pecado.',lesson:'A Fórmula disse que o pecado corrompe toda a pessoa, mas não é a matéria que Deus criou.',left:{label:'Distinguir criação e corrupção',next:'crypto',mark:'confession',codex:'controversies'},right:{label:'Dizer que a pessoa é feita de pecado',end:'flacius'}},
      crypto:{place:'Dresden',speaker:'Dois ensinos circulam na mesma igreja',prompt:'É correto assinar uma confissão luterana e ensinar outra coisa em segredo?',context:'Pastores e famílias já não sabem qual voz é verdadeira.',lesson:'Em Dresden, o ensino secreto sobre a Ceia foi descoberto e causou uma grande crise de confiança.',left:{label:'Exigir uma fala honesta',next:'torgau',mark:'confession'},right:{label:'Manter duas mensagens',end:'crypto'}},
      torgau:{place:'Torgau',speaker:'Papéis de muitas cidades cobrem a mesa',prompt:'Os teólogos juntarão textos rivais e deixarão outras igrejas examinar o rascunho?',context:'Ninguém conseguirá paz apenas gritando mais alto.',lesson:'O Livro de Torgau foi enviado para igrejas e professores, que responderam com críticas e sugestões.',left:{label:'Impor o texto de um só grupo',end:'formula'},right:{label:'Escrever e pedir opiniões',next:'bergen',mark:'witness'}},
      bergen:{place:'Mosteiro de Bergen',speaker:'As respostas chegaram em caixas',prompt:'Os autores corrigem o texto artigo por artigo ou ignoram quem discordou?',context:'Cada frase precisa dizer com clareza o que é aceito e o que é rejeitado.',lesson:'No mosteiro de Bergen, o texto foi revisto e ganhou uma parte curta e outra mais detalhada.',left:{label:'Revisar com cuidado',next:'subscriptions',mark:'scripture',codex:'formula'},right:{label:'Jogar as críticas no fogo',end:'formula'}},
      subscriptions:{place:'Dresden e outras cidades',speaker:'Pastores recebem o novo texto',prompt:'As assinaturas serão arrancadas pela força ou dadas depois de leitura e ensino?',context:'Uma confissão comum precisa ser entendida, não apenas carimbada.',lesson:'Visitadores explicaram o texto, e milhares de pastores e professores registraram sua concordância.',left:{label:'Forçar nomes sem ensinar',end:'formula'},right:{label:'Ler, explicar e então assinar',next:'book',mark:'witness'}},
      book:{place:'Dresden',speaker:'25 de junho de 1580',prompt:'Cinquenta anos depois de Augsburgo, o grande livro está pronto. Ele finalmente vai para a prensa?',context:'Credos antigos, catecismos e confissões agora formam uma coleção.',lesson:'O Livro de Concórdia foi publicado em alemão e reuniu os principais textos da confissão luterana.',left:{label:'Adiar mais uma vez',end:'formula'},right:{label:'Publicar o Livro de Concórdia',next:'prague',mark:'confession',codex:'book',achievement:'confissao-livro-concordia'}},
      prague:{place:'Praga',speaker:'Homens são lançados de uma janela',prompt:'A revolta cresce. As armas podem garantir para sempre a liberdade da fé?',context:'Uma briga local está prestes a chamar exércitos de toda a Europa.',lesson:'A revolta da Boêmia abriu a Guerra dos Trinta Anos, uma das guerras mais destrutivas da Europa.',left:{label:'Não chamar a violência de santa',next:'whiteMountain',mark:'confession',codex:'bohemia'},right:{label:'Confiar a fé às armas',end:'bohemia'}},
      whiteMountain:{place:'Praga, após a Montanha Branca',speaker:'Soldados batem à porta',prompt:'A família pode mudar de fé, perder tudo ou partir. O que vai na carroça?',context:'A casa ficará para trás; livros e memória ainda podem atravessar a fronteira.',lesson:'Muitas famílias deixaram a Boêmia levando Bíblias, hinários e livros de confissão.',left:{label:'Mudar de fé para ficar',end:'conversion'},right:{label:'Partir com os livros',next:'westphalia',mark:'witness',achievement:'confissao-exilio'}},
      westphalia:{place:'Münster e Osnabrück',speaker:'Os sinos anunciam a paz',prompt:'Depois de trinta anos de guerra, o que os exilados conseguiram levar até 1648?',context:'A casa antiga foi perdida, mas filhos e netos ainda conhecem as palavras carregadas na estrada.',lesson:'A Paz de Vestfália encerrou a guerra e confirmou uma ordem com mais de uma confissão cristã no Império.',left:{label:'Palavra, confissão e memória',end:'victory',mark:'witness',codex:'westphalia',achievement:'confissao-vitoria'},right:{label:'Apenas a derrota',end:'conversion'}}
    }
  };

  const detailedCards = {
    birth: {
      speaker:'Uma família entre Eisleben e Mansfeld',
      context:'Martinho nasce em Eisleben em 1483 e logo é levado para Mansfeld, onde o pai trabalha com cobre. Hans conhece a dureza das minas e acredita que muitos anos de estudo podem dar ao filho uma vida mais segura e respeitada.',
      prompt:'A família pagará seus estudos ou o mandará cedo para o trabalho?',
      left:{label:'Colocá-lo cedo nas minas'}, right:{label:'Pagar seus estudos'}
    },
    magdeburgSchool: {
      speaker:'Martinho chega sozinho a Magdeburgo',
      context:'Em 1497, com cerca de treze anos, Martinho deixa a casa dos pais para estudar latim em Magdeburgo. O dinheiro é curto, a disciplina é severa e ele canta diante das casas para conseguir comida. Voltar significaria interromper a formação planejada pelo pai.',
      prompt:'Ele suporta mais um ano longe de casa?',
      left:{label:'Continuar os estudos'}, right:{label:'Voltar para Mansfeld'}
    },
    erfurt: {
      speaker:'Os portões da Universidade de Erfurt',
      context:'Depois de estudar em Eisenach, Martinho chega a Erfurt em 1501. Seu pai paga uma universidade conhecida e espera que ele se torne advogado, profissão capaz de elevar toda a família. Entrar significa anos de latim, lógica, livros e despesas.',
      prompt:'Martinho entra na universidade?',
      left:{label:'Trabalhar com o pai'}, right:{label:'Matricular-se em Erfurt'}
    },
    storm: {
      speaker:'A estrada de Stotternheim, 2 de julho de 1505',
      context:'Martinho já é mestre e começou o curso de Direito desejado pelo pai. Voltando de uma visita à família, uma tempestade o derruba no caminho. Convencido de que morrerá, grita: “Santa Ana, ajude-me! Eu me tornarei monge.”',
      prompt:'Quando o céu se abre, ele cumpre o que prometeu?',
      left:{label:'Entrar no mosteiro'}, right:{label:'Retomar o curso de Direito'}
    },
    firstmass: {
      speaker:'A primeira missa no mosteiro de Erfurt',
      context:'Em 1507, depois de ser ordenado padre, Martinho celebra sua primeira missa diante dos monges e de seu pai. Ao pronunciar as palavras do altar, sente que um pecador está falando com o Deus santo. O medo quase o faz abandonar a cerimônia no meio.',
      prompt:'Ele foge do altar ou termina a missa?',
      left:{label:'Abandonar a cerimônia'}, right:{label:'Terminar a missa'}
    },
    rome: {
      speaker:'Um monge alemão chega a Roma',
      context:'A ordem agostiniana envia Martinho a Roma em 1510 ou 1511 para tratar de seus assuntos. Ele chega como peregrino, visita igrejas e relíquias, mas também encontra missas ditas às pressas e devoção misturada a dinheiro. A viagem aumenta perguntas que ele ainda não sabe responder.',
      prompt:'Ele esconde a decepção ou investiga o que viu?',
      left:{label:'Guardar e investigar'}, right:{label:'Fingir que nada viu'}
    },
    wittenberg: {
      speaker:'Staupitz aponta para uma universidade nova',
      context:'Johann von Staupitz, responsável pela ordem, percebe a angústia de Martinho e o envia para Wittenberg. A pequena cidade tem ruas de barro e uma universidade fundada há poucos anos. Staupitz acredita que ensinar a Bíblia obrigará o jovem monge a procurar respostas no texto.',
      prompt:'Martinho aceita trocar o silêncio do mosteiro pela sala de aula?',
      left:{label:'Ensinar em Wittenberg'}, right:{label:'Permanecer escondido'}
    },
    doctorate: {
      speaker:'Um juramento diante da Universidade de Wittenberg',
      context:'Em 1512, Martinho pode receber o doutorado em teologia. O título não é apenas uma honra: o juramento o obriga a estudar, explicar e defender publicamente a Bíblia. Salmos, Romanos e Gálatas passarão a ser seu trabalho diário.',
      prompt:'Ele assume publicamente essa responsabilidade?',
      left:{label:'Recusar o doutorado'}, right:{label:'Jurar ensinar a Bíblia'}
    },
    romans: {
      speaker:'Romanos permanece aberto sob a lamparina',
      context:'Preparando aulas, Martinho volta muitas vezes à frase “o justo viverá por fé”. Ele sempre ouviu “justiça de Deus” como a medida que condena o culpado. Agora percebe que Paulo também fala da justiça que Deus oferece a quem confia em Cristo.',
      prompt:'Onde o pecador encontrará segurança diante de Deus?',
      left:{label:'No presente recebido pela fé'}, right:{label:'Nos méritos acumulados'}
    },
    tetzel: {
      speaker:'Tetzel prega na praça de Jüterbog',
      context:'O vendedor de indulgências Johann Tetzel não pode atuar na Saxônia, mas moradores de Wittenberg atravessam a fronteira para ouvi-lo. Eles voltam com certificados que prometem reduzir penas por pecados para vivos e mortos. Lutero teme que o papel substitua arrependimento, fé e cuidado pastoral.',
      prompt:'O professor se cala ou chama a universidade para discutir isso?',
      left:{label:'Evitar o conflito'}, right:{label:'Preparar um debate público'}
    },
    theses: {
      speaker:'Noventa e cinco pontos sobre a mesa',
      context:'Lutero escreve em latim 95 pontos para um debate acadêmico sobre arrependimento e indulgências. Em 31 de outubro de 1517, pode enviá-los ao arcebispo Alberto de Mainz e divulgá-los em Wittenberg. Impressores poderão copiar o texto sem esperar sua permissão.',
      prompt:'Ele envia as teses e abre o debate?',
      left:{label:'Enviar e divulgar as teses'}, right:{label:'Guardar tudo na gaveta'}
    },
    cajetan: {
      speaker:'Três encontros tensos em Augsburgo',
      context:'Em 1518, o cardeal Caetano recebe Lutero como representante do papa. Em vez do debate bíblico esperado, exige que ele diga uma palavra: “revogo”. Lutero pede que apontem seu erro nas Escrituras. Amigos avisam que uma prisão pode acontecer antes que ele deixe a cidade.',
      prompt:'Ele volta atrás sem explicação ou exige prova?',
      left:{label:'Exigir prova nas Escrituras'}, right:{label:'Revogar sem explicação'}
    },
    leipzig: {
      speaker:'Johann Eck conduz o debate de Leipzig',
      context:'Em 1519, Eck leva a discussão para além das indulgências. Pergunta se papas e concílios podem errar e lembra Jan Hus, queimado como herege um século antes. Concordar com Hus em qualquer ponto pode fazer Lutero parecer inimigo de toda a Igreja.',
      prompt:'Lutero evita o risco ou responde sobre a autoridade final?',
      left:{label:'Fugir da pergunta'}, right:{label:'Colocar a Bíblia acima de todos'}
    },
    treatises: {
      speaker:'Três manuscritos chegam à prensa',
      context:'Em 1520, a discussão alcançou o poder do papa, os sacramentos e a liberdade cristã. Lutero prepara três livros: um chama governantes à reforma, outro critica o sistema sacramental e o terceiro explica a liberdade que serve ao próximo. Publicá-los ampliará muito o conflito.',
      prompt:'Ele limita a disputa ou publica os três livros?',
      left:{label:'Publicar os três livros'}, right:{label:'Falar apenas das indulgências'}
    },
    bull: {
      speaker:'A bula Exsurge Domine chega de Roma',
      context:'O documento condena 41 afirmações ligadas a Lutero e concede sessenta dias para que ele volte atrás. Se obedecer, deve rejeitar seus próprios livros. Se queimar a bula diante de professores e estudantes, mostrará publicamente que não aceita o julgamento de Roma.',
      prompt:'Qual texto será entregue ao fogo?',
      left:{label:'Queimar os livros de Lutero'}, right:{label:'Queimar a bula papal'}
    },
    worms: {
      speaker:'O salão do bispo está cheio em Worms',
      context:'Em abril de 1521, Lutero comparece diante do jovem imperador Carlos V com promessa de salvo-conduto. Seus livros estã empilhados sobre uma mesa. Ele admite que os escreveu, pede uma noite para pensar e sabe que recusar a retratação poderá transformá-lo em criminoso do Império.',
      prompt:'Na segunda audiência, ele retira seus livros?',
      left:{label:'Manter o que escreveu'}, right:{label:'Revogar todos os livros'}
    },
    road: {
      speaker:'Cavaleiros mascarados fecham a estrada',
      context:'Depois de Worms, o imperador proíbe os livros de Lutero e ordena que ninguém lhe dê abrigo. O eleitor Frederico, que o protege sem apoiar tudo o que ele diz, organiza um falso sequestro no caminho de volta. Os cavaleiros devem fazê-lo desaparecer antes que agentes imperiais o encontrem.',
      prompt:'Lutero aceita o esconderijo preparado por seus aliados?',
      left:{label:'Seguir sozinho para Wittenberg'}, right:{label:'Aceitar a proteção secreta'}
    },
    wartburg: {
      speaker:'O “Cavaleiro Jorge” fecha a porta de Wartburg',
      context:'No castelo, Lutero deixa crescer a barba e usa outro nome. Quase ninguém sabe onde ele está. Em vez de apenas esperar, recebe um Novo Testamento grego e decide traduzir o texto para um alemão que comerciantes, artesãos e famílias possam compreender.',
      prompt:'Ele usa o esconderijo para traduzir ou apenas espera?',
      left:{label:'Traduzir o Novo Testamento'}, right:{label:'Esperar sem escrever'}
    },
    invocavit: {
      speaker:'Notícias inquietantes chegam de Wittenberg',
      context:'Durante o esconderijo, reformadores da cidade aceleram mudanças no culto. Imagens são quebradas, altares removidos e pessoas pressionadas a agir antes de entender. Voltar significa deixar a segurança de Wartburg mesmo sendo um homem fora da lei.',
      prompt:'Lutero arrisca a prisão para acalmar a cidade?',
      left:{label:'Voltar e pregar por oito dias'}, right:{label:'Apoiar a imposição pela força'}
    },
    hymns: {
      speaker:'Uma canção atravessa a oficina',
      context:'Livros ainda são caros e muita gente não sabe ler. Uma melodia, porém, passa de boca em boca nas casas, escolas e mercados. Escrever hinos em alemão permitirá que crianças e trabalhadores aprendam a fé cantando, não apenas ouvindo o padre.',
      prompt:'O ensino ficará nos livros ou também ganhará voz?',
      left:{label:'Deixar o povo apenas ouvir'}, right:{label:'Escrever hinos em alemão'}
    },
    peasants: {
      speaker:'A revolta cobre a Turíngia de fumaça',
      context:'Em 1524 e 1525, camponeses apresentam queixas reais contra impostos e abusos, mas parte da revolta passa a saquear mosteiros e castelos. Exércitos dos príncipes respondem com massacre. Usar a liberdade cristã para chamar qualquer lado de santo transformará o Evangelho em arma.',
      prompt:'Lutero abençoa a revolta ou rejeita opressão e massacre?',
      left:{label:'Chamar a revolta de santa'}, right:{label:'Rejeitar opressão e massacre'}
    },
    marriage: {
      speaker:'Katharina von Bora permanece em Wittenberg',
      context:'Katharina fugiu do convento com outras freiras e não pode voltar para a família. Depois que as companheiras encontram novos lares, ela diz que aceitaria casar com Lutero. A união de um ex-monge com uma ex-freira causará escândalo e mostrará que o casamento também é vocação cristã.',
      prompt:'Lutero forma uma casa com Katharina?',
      left:{label:'Manter a antiga aparência'}, right:{label:'Casar-se com Katharina'}
    },
    visitations: {
      speaker:'Visitadores entram nas vilas da Saxônia',
      context:'Entre 1527 e 1528, equipes examinam igrejas e escolas. Encontram pastores mal preparados e famílias que não conseguem explicar o Pai-Nosso, o Credo ou os Mandamentos. A Reforma circulou nas universidades, mas ainda não chegou claramente à mesa de muita gente.',
      prompt:'A falta de conhecimento será punida ou ensinada?',
      left:{label:'Punir quem não sabe'}, right:{label:'Preparar ensino simples'}
    },
    catechisms: {
      speaker:'Uma família se reúne ao redor da mesa',
      context:'Lutero prepara um catecismo curto, em perguntas e respostas, para pais ensinarem filhos e empregados. Também escreve uma explicação maior para pastores e professores. O objetivo é ligar casa e igreja com as mesmas palavras sobre Mandamentos, Credo, oração, Batismo e Ceia.',
      prompt:'Quem receberá esse ensino básico?',
      left:{label:'Casas, escolas e igrejas'}, right:{label:'Somente padres e doutores'}
    },
    marburg: {
      speaker:'Lutero escreve uma frase na mesa de Marburgo',
      context:'Em 1529, o príncipe Filipe de Hesse quer unir luteranos e seguidores de Zwinglio contra inimigos comuns. Os teólogos concordam em quatorze pontos, mas divergem sobre as palavras de Cristo na Ceia: “Isto é o meu corpo.” Um texto vago facilitaria a aliança militar.',
      prompt:'Eles escondem a diferença para conseguir a aliança?',
      left:{label:'Assinar uma frase vaga'}, right:{label:'Confessar a diferença claramente'}
    },
    augsburg: {
      speaker:'Mensageiros ligam Coburgo a Augsburgo',
      context:'Lutero continua proibido pelo Império e não pode comparecer à Dieta de Augsburgo. Protegido na fortaleza de Coburgo, troca cartas com Melanchthon, que prepara uma exposição pública da fé luterana para o imperador. O texto precisa mostrar acordo e responder acusações.',
      prompt:'Lutero apoia Melanchthon à distância?',
      left:{label:'Aconselhar por cartas'}, right:{label:'Impedir a apresentação'}
    },
    bible: {
      speaker:'Hebraico, grego e alemão cobrem a mesa',
      context:'Depois do Novo Testamento, ainda falta traduzir grande parte da Bíblia. Lutero trabalha com Melanchthon e outros especialistas, compara palavras antigas e escuta como o povo fala. Uma tradução feita por uma equipe será mais lenta, mas poderá ser mais clara e precisa.',
      prompt:'Ele aceita revisar cada livro com outros estudiosos?',
      left:{label:'Traduzir e revisar em equipe'}, right:{label:'Trabalhar completamente sozinho'}
    },
    smalcald: {
      speaker:'O eleitor pede uma confissão para o concílio',
      context:'Em 1536, um concílio da Igreja parece próximo. O eleitor João Frederico pede que Lutero registre os ensinamentos que os luteranos podem discutir e os pontos que não podem abandonar. A saúde do reformador piora, e talvez ele nem consiga comparecer pessoalmente.',
      prompt:'Lutero deixa por escrito o que considera inegociável?',
      left:{label:'Deixar tudo indefinido'}, right:{label:'Escrever os Artigos'}
    },
    magdalena: {
      speaker:'O quarto de Magdalena fica em silêncio',
      context:'Em 1542, Magdalena, filha de Lutero e Katharina, adoece gravemente aos treze anos. Os pais permanecem ao lado da cama até ela morrer nos braços do pai. Não existe decisão capaz de evitar a perda; resta escolher como falar da dor dentro da própria casa.',
      prompt:'A família esconde o choro ou o atravessa com esperança?',
      left:{label:'Chorar e falar da esperança'}, right:{label:'Fingir que não há dor'}
    },
    mansfeld: {
      speaker:'Uma carta chama Lutero de volta a Mansfeld',
      context:'No inverno de 1546, os condes de Mansfeld discutem direitos, terras e rendas das minas. Pedem ao velho professor, criado naquela região, que ajude na negociação. Lutero está cansado, sofre com a saúde e sabe que a viagem gelada pode ser sua última estrada.',
      prompt:'Ele viaja para tentar reconciliar os condes?',
      left:{label:'Recusar a mediação'}, right:{label:'Viajar para negociar a paz'}
    },
    death: {
      speaker:'A jornada de Lutero termina em Eisleben',
      context:'Lutero ajuda a encaminhar o acordo em Mansfeld, mas morre em 18 de fevereiro de 1546 na cidade onde nasceu. Seu corpo voltará a Wittenberg; suas decisões, porém, não podem responder a todas as crises futuras. A campanha agora passa para pastores, professores, famílias e cidades.',
      prompt:'A nova geração seguirá uma relíquia ou o ensino confessado?',
      left:{label:'Transformá-lo em relíquia'}, right:{label:'Voltar aos textos e à Bíblia'}
    },
    war: {
      speaker:'A Liga de Esmalcalda é derrotada em Mühlberg',
      context:'Príncipes e cidades luteranas formaram uma liga defensiva, mas o exército de Carlos V vence a batalha em 1547. O eleitor João Frederico é capturado e perde suas terras. Com a resistência militar quebrada, o imperador acredita que também pode determinar a religião dos territórios vencidos.',
      prompt:'A vitória militar decide o que as igrejas devem crer?',
      left:{label:'Separar espada e doutrina'}, right:{label:'Deixar o vencedor escolher a fé'}
    },
    interim: {
      speaker:'O Interim de Augsburgo chega com selo imperial',
      context:'Em 1548, Carlos V impõe regras temporárias enquanto o concílio de Trento continua. Elas restauram grande parte das práticas antigas e permitem aos luteranos poucas concessões. Pastores recebem poucos dias para aceitar; quem recusar pode perder igreja, salário, casa e liberdade.',
      prompt:'Eles assinam para ficar ou recusam mesmo diante do exílio?',
      left:{label:'Assinar para conservar o cargo'}, right:{label:'Recusar e perder a segurança'}
    },
    magdeburg: {
      speaker:'Magdeburgo resiste atrás das muralhas',
      context:'Enquanto muitos territórios cedem ao Interim, Magdeburgo abriga pastores expulsos e se torna centro de resistência. Durante o cerco de 1550 e 1551, impressores trabalham entre o som dos canhões. Fechar as oficinas pode aliviar a pressão; mantê-las espalhará a resposta pela Alemanha.',
      prompt:'As prensas continuam funcionando durante o cerco?',
      left:{label:'Manter as prensas trabalhando'}, right:{label:'Fechar as oficinas'}
    },
    osiander: {
      speaker:'Uma disputa em Königsberg chega ao confessionário',
      context:'Andreas Osiander ensina que a pessoa é aceita por Deus por causa da justiça divina que passa a habitar nela. Seus adversários respondem que o perdão descansa na vida e obediência de Cristo, recebidas pela fé. Para uma consciência assustada, isso muda onde procurar certeza.',
      prompt:'A certeza estará dentro da pessoa ou no que Cristo fez?',
      left:{label:'Procurar a prova dentro de si'}, right:{label:'Confiar no que Cristo fez'}
    },
    major: {
      speaker:'A expressão “boas obras” divide Wittenberg',
      context:'George Major quer impedir que a fé vire desculpa para uma vida sem amor e afirma que boas obras são necessárias para a salvação. Outros temem que essa frase transforme ajuda ao próximo em pagamento exigido por Deus. A discussão precisa preservar tanto a graça quanto seus frutos.',
      prompt:'As obras compram a salvação ou nascem da fé?',
      left:{label:'Tratá-las como pagamento'}, right:{label:'Confessá-las como fruto da fé'}
    },
    augsburgpeace: {
      speaker:'Príncipes assinam a Paz de Augsburgo',
      context:'Em 1555, o acordo interrompe a guerra e reconhece territórios católicos e luteranos. Cada governante escolherá a confissão oficial de suas terras, e moradores que não a aceitarem poderão partir. A paz política não resolve as muitas disputas que dividem os próprios luteranos.',
      prompt:'A nova paz encerra o trabalho de esclarecimento?',
      left:{label:'Usar a paz para buscar acordo'}, right:{label:'Declarar todos os problemas resolvidos'}
    },
    synergy: {
      speaker:'Uma pergunta sobre o primeiro instante da fé',
      context:'Alguns professores dizem que o Espírito inicia a conversão, mas a vontade humana precisa colaborar com uma capacidade própria. Outros afirmam que a própria vontade está ferida e que o Espírito cria a fé pela Palavra. A diferença decide se a graça apenas ajuda ou realmente dá o começo.',
      prompt:'Quem dá o primeiro passo na conversão?',
      left:{label:'A vontade humana coopera primeiro'}, right:{label:'O Espírito cria a fé'}
    },
    flacius: {
      speaker:'A discussão sobre o pecado chega a Weimar',
      context:'Matthias Flacius quer afirmar que o pecado original corrompe toda a pessoa, não apenas uma parte. Na disputa, passa a chamá-lo de substância do ser humano. Seus antigos aliados respondem que isso confunde a criatura feita por Deus com a corrupção que a destrói.',
      prompt:'Pecado e natureza criada são a mesma coisa?',
      left:{label:'Distinguir criatura e corrupção'}, right:{label:'Chamar a natureza de pecado'}
    },
    crypto: {
      speaker:'Cartas secretas são descobertas em Dresden',
      context:'Teólogos da corte assinam textos luteranos, mas em particular ensinam outra explicação para a Ceia e para a pessoa de Cristo. Quando documentos secretos aparecem em 1574, pastores e famílias percebem que recebiam duas mensagens. A crise agora envolve doutrina e confiança pública.',
      prompt:'A igreja tolera uma assinatura e um ensino secreto?',
      left:{label:'Exigir uma confissão honesta'}, right:{label:'Manter as duas mensagens'}
    },
    torgau: {
      speaker:'Seis teólogos cercam uma mesa em Torgau',
      context:'Em 1576, Andreae, Chemnitz, Selnecker e outros recebem documentos produzidos por grupos luteranos diferentes. Precisam reunir o que concorda, enfrentar os pontos de disputa e preparar um rascunho comum. O texto não será final: cópias seguirão para outros territórios julgarem cada artigo.',
      prompt:'Eles impõem uma facção ou enviam o rascunho para exame?',
      left:{label:'Impor o texto de um grupo'}, right:{label:'Redigir e pedir pareceres'}
    },
    bergen: {
      speaker:'Caixas de pareceres chegam ao mosteiro de Bergen',
      context:'Cerca de vinte e cinco respostas ao Livro de Torgau trazem apoio, críticas e pedidos de clareza. Em 1577, os autores se reúnem perto de Magdeburgo para revisar palavras ambíguas. Do trabalho sairão um resumo curto, a Epítome, e uma explicação longa, a Declaração Sólida.',
      prompt:'Eles corrigem o texto com os pareceres recebidos?',
      left:{label:'Revisar artigo por artigo'}, right:{label:'Ignorar todas as críticas'}
    },
    subscriptions: {
      speaker:'Cópias da Fórmula percorrem os territórios',
      context:'A Fórmula pronta é enviada a príncipes, cidades, igrejas e escolas. O plano é circular o texto, permitir discussão e recolher assinaturas conscientes, não surpreender pessoas com um decreto. Aproximadamente oito mil pastores e professores acabarão registrando concordância.',
      prompt:'A unidade virá da explicação ou da força?',
      left:{label:'Forçar assinaturas sem leitura'}, right:{label:'Ler, explicar e então assinar'}
    },
    book: {
      speaker:'Dresden prepara a edição de 1580',
      context:'Cinquenta anos depois da Confissão de Augsburgo, uma coleção reúne os credos antigos, a Confissão e sua defesa, os Catecismos, os Artigos de Esmalcalda e a nova Fórmula. Não é uma nova Bíblia, mas um registro comum do que essas igrejas ensinam a partir dela.',
      prompt:'O Livro de Concórdia finalmente entra na prensa?',
      left:{label:'Adiar outra vez'}, right:{label:'Publicar o Livro de Concórdia'}
    },
    prague: {
      speaker:'A revolta começa no castelo de Praga',
      context:'Em 1618, nobres protestantes lançam dois governadores reais e um secretário pela janela; os três sobrevivem. Os estados da Boêmia rompem com o rei Habsburgo, escolhem outro rei e formam um exército. O conflito local agora pode atrair as grandes potências do Império.',
      prompt:'A revolta segue o caminho histórico até a guerra?',
      left:{label:'Seguir a revolta até a guerra',next:'whiteMountain',mark:'witness',codex:'bohemia'},
      right:{label:'Recuar e buscar um acordo',end:'praguePeace'}
    },
    whiteMountain: {
      speaker:'A derrota chega às portas de Praga',
      context:'Em novembro de 1620, o exército dos estados da Boêmia é derrotado na Montanha Branca. No ano seguinte, 27 líderes são executados na Praça da Cidade Velha. Pastores são expulsos, propriedades confiscadas e famílias pressionadas a aceitar a religião dos Habsburgos ou deixar o país.',
      prompt:'A família muda de fé para ficar ou parte com seus livros?',
      left:{label:'Mudar de fé e conservar a casa'}, right:{label:'Partir e levar a confissão'}
    },
    westphalia: {
      speaker:'Mensageiros anunciam a paz em Münster e Osnabrück',
      context:'Em 1648, tratados encerram trinta anos de guerra e reconhecem católicos, luteranos e reformados dentro da ordem imperial. A paz não devolve automaticamente as casas dos exilados nem restaura a antiga liberdade na Boêmia. Ainda assim, filhos e netos preservaram Bíblias, hinos e confissões levados pela estrada.',
      prompt:'Depois de tantas perdas, o que realmente atravessou as fronteiras?',
      left:{label:'Palavra, confissão e memória'}, right:{label:'Nada além da derrota'}
    }
  };

  const narrative = window.A_CONFISSAO_NARRATIVE_V2;
  Object.entries(detailedCards).forEach(([id, copy]) => {
    const card = narrative.cards[id];
    if(!card) return;
    const originalLeft = card.left;
    const originalRight = card.right;
    Object.assign(card, copy);
    if(copy.left) card.left = {...originalLeft, ...copy.left};
    if(copy.right) card.right = {...originalRight, ...copy.right};
  });
  narrative.endings.praguePeace = ending(
    'A guerra que não começou',
    'Os estados da Boêmia recuam, aceitam negociar e a revolta termina antes da Montanha Branca. Esta linha evita a guerra, mas também abandona a sequência histórica que o jogo procura reconstruir.',
    'Na história real, os rebeldes depuseram Fernando II, escolheram Frederico V como rei e foram derrotados na Montanha Branca em 1620.',
    'exile'
  );
})();
