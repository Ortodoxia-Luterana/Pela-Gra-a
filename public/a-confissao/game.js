(() => {
  'use strict';
  const API = '/api/a-confissao/save';
  const TOTAL_CORE_CARDS = 47;
  const ART = {
    youth: 'assets/chapter-luther.webp',
    reform: 'assets/chapter-worms.webp',
    concord: 'assets/chapter-concord.webp',
    exile: 'assets/chapter-exile.webp'
  };
  const chapters = {
    youth: 'O jovem Martinho', reform: 'A Palavra em público', confession: 'Uma Igreja confessa',
    concord: 'Depois de Lutero', exile: 'Confissão sob a espada'
  };
  const codex = [
    { id:'eisleben', group:'Vida de Lutero', year:'1483', title:'Eisleben e Mansfeld', text:'Martinho nasceu em Eisleben em 10 de novembro de 1483 e foi batizado no dia seguinte. A família logo se mudou para Mansfeld, ligada ao trabalho nas minas de cobre.' },
    { id:'schools', group:'Vida de Lutero', year:'1497–1501', title:'Magdeburgo, Eisenach e Erfurt', text:'Estudou em Magdeburgo com os Irmãos da Vida Comum, depois em Eisenach, e ingressou na Universidade de Erfurt em 1501.' },
    { id:'storm', group:'Vida de Lutero', year:'1505', title:'A tempestade de Stotternheim', text:'Depois do mestrado e do início dos estudos jurídicos, uma tempestade em 2 de julho marcou sua decisão de entrar no mosteiro agostiniano.' },
    { id:'rome', group:'Vida de Lutero', year:'1510/11', title:'A viagem a Roma', text:'Lutero foi a Roma em missão de sua ordem. A experiência combinou devoção intensa e decepção com práticas que encontrou ali.' },
    { id:'doctorate', group:'Vida de Lutero', year:'1512', title:'Doutor das Escrituras', text:'Recebeu o doutorado em teologia e assumiu a cátedra bíblica em Wittenberg, compromisso que ele entendeu como dever público de ensinar a Escritura.' },
    { id:'theses', group:'Reforma', year:'1517', title:'As 95 Teses', text:'Em 31 de outubro Lutero enviou suas teses sobre indulgências ao arcebispo Alberto de Mainz. A publicação na porta da igreja é tradição famosa, mas sua forma exata é discutida por historiadores.' },
    { id:'cajetan', group:'Reforma', year:'1518', title:'Diante de Caetano', text:'Em Augsburgo, o cardeal Caetano exigiu retratação. Lutero pediu demonstração pelas Escrituras e deixou a cidade sem recuar.' },
    { id:'leipzig', group:'Reforma', year:'1519', title:'O debate de Leipzig', text:'No debate com Johann Eck, a discussão chegou à autoridade dos concílios, do papa e ao caso de Jan Hus.' },
    { id:'treatises', group:'Reforma', year:'1520', title:'Três escritos de 1520', text:'À Nobreza Cristã, Do Cativeiro Babilônico da Igreja e Da Liberdade Cristã ampliaram o conflito para autoridade, sacramentos e liberdade evangélica.' },
    { id:'worms', group:'Reforma', year:'1521', title:'A Dieta de Worms', text:'Convocado diante do imperador Carlos V, Lutero reconheceu seus livros e se recusou a retratar tudo sem ser convencido pela Escritura e pela razão evidente.' },
    { id:'wartburg', group:'Reforma', year:'1521–1522', title:'Cavaleiro Jorge', text:'Protegido no castelo de Wartburg sob o disfarce de Junker Jörg, traduziu o Novo Testamento para o alemão.' },
    { id:'invocavit', group:'Reforma', year:'1522', title:'Sermões de Invocavit', text:'Retornou a Wittenberg e pregou por oito dias contra reformas impostas pela violência e sem instrução paciente.' },
    { id:'marriage', group:'Casa de Lutero', year:'1525', title:'Katharina von Bora', text:'Lutero casou-se com a ex-freira Katharina von Bora. A casa no antigo mosteiro tornou-se lar, hospedaria, escola e centro de conversas.' },
    { id:'catechisms', group:'Confissões', year:'1529', title:'Catecismos', text:'Depois de visitações que revelaram enorme carência de instrução, Lutero preparou os Catecismos Menor e Maior para famílias, pastores e professores.' },
    { id:'marburg', group:'Confissões', year:'1529', title:'Colóquio de Marburgo', text:'Lutero e Zwinglio concordaram em muitos pontos, mas não na presença do corpo e sangue de Cristo na Ceia.' },
    { id:'augsburg', group:'Confissões', year:'1530', title:'Confissão de Augsburgo', text:'Enquanto Lutero permaneceu protegido em Coburg, Melanchthon apresentou a Confissão de Augsburgo ao imperador em 25 de junho.' },
    { id:'bible', group:'Confissões', year:'1534', title:'Bíblia alemã completa', text:'A tradução completa foi publicada em 1534, fruto de trabalho coletivo e revisão cuidadosa da língua.' },
    { id:'magdalena', group:'Casa de Lutero', year:'1542', title:'A morte de Magdalena', text:'A filha Magdalena morreu aos treze anos nos braços do pai. As fontes preservam a dor familiar e a esperança cristã expressa naquele quarto.' },
    { id:'death', group:'Vida de Lutero', year:'1546', title:'O retorno a Eisleben', text:'Lutero viajou para mediar uma disputa entre os condes de Mansfeld. Morreu em Eisleben em 18 de fevereiro de 1546.' },
    { id:'interim', group:'Depois de Lutero', year:'1546–1548', title:'Guerra de Esmalcalda e Interim', text:'Após a derrota da Liga de Esmalcalda, Carlos V impôs o Interim de Augsburgo. Pastores que recusaram concessões sofreram deposição, fuga e exílio.' },
    { id:'controversies', group:'Depois de Lutero', year:'1548–1577', title:'As controvérsias luteranas', text:'Adiáfora, boas obras, livre-arbítrio, pecado original, justificação, Lei e Evangelho, Ceia e cristologia dividiram os herdeiros da Reforma.' },
    { id:'formula', group:'Livro de Concórdia', year:'1577', title:'Fórmula de Concórdia', text:'Andreae, Chemnitz, Selnecker, Chytraeus, Musculus e Körner trabalharam na forma final, com Epítome e Declaração Sólida.' },
    { id:'book', group:'Livro de Concórdia', year:'1580', title:'Livro de Concórdia', text:'A edição alemã foi publicada em 25 de junho de 1580, cinquenta anos depois da apresentação da Confissão de Augsburgo.' },
    { id:'bohemia', group:'Guerra e exílio', year:'1618–1621', title:'Boêmia e a Montanha Branca', text:'A revolta boêmia abriu a Guerra dos Trinta Anos. Depois da derrota protestante em 1620, autoridades habsburgas reprimiram confissões não católicas; líderes foram executados e muitos recusantes partiram para o exílio.' },
    { id:'westphalia', group:'Guerra e exílio', year:'1648', title:'Paz de Vestfália', text:'Os tratados de 1648 encerraram a guerra e confirmaram uma ordem confessional mais ampla no Império, embora não restaurassem a liberdade perdida na Boêmia habsburga.' },
    { id:'sources', group:'Fontes', year:'Pesquisa', title:'Base histórica da campanha', text:'A cronologia foi conferida com os arquivos de Luther.de, os memoriais de Wittenberg e Worms, as introduções históricas do Livro de Concórdia, materiais da LCMS sobre o Interim e a Fórmula, e estudos sobre a repressão pós-Montanha Branca. Links completos ficam na documentação do jogo.' }
  ];

  const E = (title, body, fact, art='exile', win=false) => ({ ending:true, title, body, fact, art, win });
  const endings = {
    law:E('O advogado de Mansfeld','Martinho conclui a carreira jurídica desejada por seu pai. A Igreja segue sem sua voz e a jornada termina antes do mosteiro.','A entrada no mosteiro em 1505 rompeu com o projeto familiar de uma carreira no direito.','youth'),
    indulgence:E('A moeda vence','As indulgências permanecem sem contestação pública em Wittenberg. Sem as teses, esta linha da Reforma não começa.','Lutero não pretendia fundar uma nova igreja em 1517; buscava um debate acadêmico e pastoral.','reform'),
    cajetan:E('Retratação em Augsburgo','Diante da pressão, você aceita a retratação sem debate bíblico. A controvérsia termina em silêncio.','Lutero deixou Augsburgo secretamente após recusar uma retratação simples.','reform'),
    leipzig:E('A autoridade não é tocada','Você evita o ponto decisivo e mantém o debate dentro de limites que Eck controla. A questão da autoridade permanece fechada.','Leipzig levou Lutero a admitir que concílios podiam errar, intensificando a ruptura.','reform'),
    bull:E('Sessenta dias','A bula vence. Os livros são recolhidos e a voz pública de Wittenberg desaparece.','Exsurge Domine ameaçou excomunhão se Lutero não se retratasse em sessenta dias.','reform'),
    worms:E('A palavra retirada','Você se retrata em Worms. Sai vivo, mas sua confissão pública morre diante do imperador.','O Édito de Worms declarou Lutero fora da lei depois de sua recusa.','reform'),
    road:E('Morto na estrada','Você dispensa a escolta secreta. Agentes imperiais encontram o proscrito antes de Wittenberg.','O “sequestro” de Lutero foi organizado por aliados de Frederico, o Sábio, para protegê-lo.','reform'),
    radicals:E('Wittenberg em fogo','A reforma é imposta pela força. Tumultos provocam repressão e sua causa é associada à desordem.','Nos Sermões de Invocavit, Lutero defendeu mudança pela Palavra e pela persuasão, não pela coerção.','reform'),
    revolt:E('Entre foices e espadas','Você abençoa a violência da revolta. A tropa principesca esmaga o grupo e você morre com os camponeses.','Lutero criticou tanto a opressão dos senhores quanto a violência revolucionária, em textos cuja dureza continua controversa.','reform'),
    marburg:E('Uma união sem acordo','Você assina uma fórmula ambígua sobre a Ceia apenas por conveniência política. A diferença reaparece mais profunda.','O Colóquio de Marburgo terminou com acordo em muitos artigos, mas não na presença corporal de Cristo.','reform'),
    interim:E('O púlpito rendido','Você aceita o Interim para conservar o cargo. A comunidade aprende que a confissão pode ser trocada por segurança.','Muitos pastores resistentes foram removidos; famílias sofreram fuga e exílio.','concord'),
    magdeburg:E('A cidade sem voz','Você abandona Magdeburgo antes de imprimir a resistência. A pressão imperial encontra menos oposição organizada.','Magdeburgo tornou-se centro de resistência ao Interim e de intensa publicação luterana.','concord'),
    osiander:E('Justificação dissolvida','Você transforma a justificação em uma mudança interior que substitui a declaração forense do perdão. A controvérsia separa as igrejas.','A Fórmula rejeitou a posição osiandrista e confessou a obediência de Cristo como base da justiça do pecador.','concord'),
    major:E('Mérito reintroduzido','Boas obras tornam-se condição de salvação. A linguagem pastoral obscurece a gratuidade do Evangelho.','A Fórmula afirmou que boas obras são frutos necessários da fé, mas não causa ou condição meritória da salvação.','concord'),
    synergy:E('Graça dividida','Você atribui à vontade humana uma cooperação espiritual própria na conversão. A controvérsia permanece aberta.','A Fórmula confessou que a conversão é obra do Espírito por meio da Palavra.','concord'),
    flacius:E('A corrupção vira essência','Ao identificar o pecado original com a própria substância humana, você torna a criação de Deus essencialmente pecado.','A Fórmula distinguiu natureza criada e corrupção profunda.','concord'),
    crypto:E('A mesa perde o corpo','Uma linguagem reformada é mantida em segredo sob assinatura luterana. Quando descoberta, a confiança desaba.','A controvérsia cripto-calvinista atingiu especialmente a doutrina da Ceia e a cristologia.','concord'),
    formula:E('Concórdia recusada','Você prefere a vitória de uma facção à formulação comum. Os territórios continuam divididos e o livro não nasce.','A Fórmula foi resultado de revisão, visitas, pareceres e assinatura ampla, não de um único decreto.','concord'),
    bohemia:E('A janela e a espada','Você entra na revolta como se a violência pudesse garantir a confissão. A derrota na Montanha Branca leva à execução na Praça da Cidade Velha.','Vinte e sete líderes boêmios foram executados em Praga em 1621 após a derrota.','exile'),
    conversion:E('A consciência silenciada','Para conservar casa e propriedade, você abandona publicamente a confissão. Sobrevive, mas a memória da comunidade se rompe.','Na Boêmia e em terras austríacas, não católicos foram pressionados a converter-se ou partir.','exile'),
    victory:E('A confissão permanece','Você atravessou 165 anos sem confundir sobrevivência com fidelidade. A Palavra foi ensinada, confessada, impressa e carregada ao exílio. A história não terminou sem perdas — mas a confissão chegou adiante.','O Livro de Concórdia de 1580 reuniu os credos, a Confissão e Apologia de Augsburgo, os Catecismos, os Artigos de Esmalcalda, o Tratado e a Fórmula de Concórdia.','exile',true)
  };

  const cards = {
    birth:{year:1483,chapter:'youth',speaker:'Hans e Margarethe Luder',prompt:'O menino será formado para subir na vida. Que caminho começa em casa?',context:'Mansfeld vive do cobre, do trabalho duro e de uma disciplina severa.',left:{label:'Deixar a escola cedo',end:'law'},right:{label:'Ensinar e enviá-lo à escola',next:'magdeburgSchool',mark:'scripture',codex:'eisleben'}},
    magdeburgSchool:{year:1497,chapter:'youth',speaker:'Martinho, 13 anos',prompt:'Magdeburgo é austera e distante. Você continuará os estudos?',context:'Os Irmãos da Vida Comum unem disciplina, devoção e ensino.',left:{label:'Voltar a Mansfeld',end:'law'},right:{label:'Prosseguir até Eisenach',next:'erfurt',mark:'scripture',codex:'schools'}},
    erfurt:{year:1501,chapter:'youth',speaker:'Universidade de Erfurt',prompt:'Seu pai espera o Direito. Você entrará na universidade?',context:'Artes, lógica e latim preparam a carreira jurídica.',left:{label:'Assumir as minas',end:'law'},right:{label:'Matricular-se em Erfurt',next:'storm',mark:'scripture'}},
    storm:{year:1505,chapter:'youth',speaker:'Estrada de Stotternheim',prompt:'O raio cai perto. A promessa feita no terror será cumprida?',context:'“Santa Ana, ajuda-me! Tornar-me-ei monge.”',left:{label:'Seguir no Direito',end:'law'},right:{label:'Entrar no mosteiro',next:'firstmass',mark:'witness',codex:'storm'}},
    firstmass:{year:1507,chapter:'youth',speaker:'Mosteiro agostiniano',prompt:'Na primeira missa, o temor de estar diante de Deus paralisa você. Vai fugir do altar?',context:'A busca por certeza não se resolve com mais desempenho religioso.',left:{label:'Abandonar o sacerdócio',end:'law'},right:{label:'Concluir a missa',next:'rome',mark:'scripture'}},
    rome:{year:1510,chapter:'youth',speaker:'Roma',prompt:'A cidade santa mistura devoção, pressa e comércio. Como você reagirá?',context:'A viagem não destrói a fé, mas aprofunda perguntas.',left:{label:'Ignorar o que viu',end:'indulgence'},right:{label:'Guardar e examinar',next:'wittenberg',mark:'scripture',codex:'rome'}},
    wittenberg:{year:1511,chapter:'youth',speaker:'Johann von Staupitz',prompt:'Wittenberg precisa de um professor da Bíblia. Você aceitará?',context:'O chamado transforma a angústia privada em responsabilidade pública.',left:{label:'Permanecer anônimo',end:'indulgence'},right:{label:'Assumir a cátedra',next:'doctorate',mark:'scripture'}},
    doctorate:{year:1512,chapter:'youth',speaker:'Universidade de Wittenberg',prompt:'O juramento de doutor obriga você a ensinar a Escritura. Vai assumi-lo?',context:'Salmos, Romanos, Gálatas e Hebreus ocuparão seus anos seguintes.',left:{label:'Recusar o doutorado',end:'indulgence'},right:{label:'Tornar-se doutor',next:'romans',mark:'scripture',codex:'doctorate'}},
    romans:{year:1515,chapter:'reform',speaker:'Carta aos Romanos',prompt:'“O justo viverá por fé.” Onde está a justiça de Deus?',context:'Não apenas a justiça que condena, mas a que Deus concede no Evangelho.',left:{label:'No mérito acumulado',end:'indulgence'},right:{label:'No dom recebido pela fé',next:'tetzel',mark:'scripture'}},
    tetzel:{year:1517,chapter:'reform',speaker:'Fronteira da Saxônia',prompt:'Tetzel vende indulgências perto de Wittenberg. Você ficará em silêncio?',context:'Pessoas apresentam certificados como segurança para si e para mortos.',left:{label:'Não criar conflito',end:'indulgence'},right:{label:'Preparar um debate',next:'theses',mark:'confession'}},
    theses:{year:1517,chapter:'reform',speaker:'Martinho Lutero',prompt:'As teses estão prontas. Você as tornará públicas?',context:'Envie-as ao arcebispo e chame a universidade ao debate.',left:{label:'Guardar as teses',end:'indulgence'},right:{label:'Publicar e enviar',next:'cajetan',mark:'confession',codex:'theses',achievement:'confissao-95-teses'}},
    cajetan:{year:1518,chapter:'reform',speaker:'Cardeal Caetano',prompt:'“Revoga.” Você se retratará sem ser convencido pela Escritura?',context:'A audiência em Augsburgo não oferece o debate esperado.',left:{label:'Retratar tudo',end:'cajetan'},right:{label:'Pedir prova bíblica',next:'leipzig',mark:'confession',codex:'cajetan'}},
    leipzig:{year:1519,chapter:'reform',speaker:'Johann Eck',prompt:'Concílios podem errar? E Jan Hus poderia ter razão em algum artigo?',context:'A pergunta empurra o debate para a fonte final de autoridade.',left:{label:'Evitar a questão',end:'leipzig'},right:{label:'Submeter tudo à Escritura',next:'treatises',mark:'scripture',codex:'leipzig'}},
    treatises:{year:1520,chapter:'reform',speaker:'A prensa de Wittenberg',prompt:'O conflito cresceu. Você falará apenas de indulgências?',context:'A autoridade, os sacramentos e a liberdade cristã agora estão em jogo.',left:{label:'Limitar o debate',end:'bull'},right:{label:'Publicar os três tratados',next:'bull',mark:'confession',codex:'treatises'}},
    bull:{year:1520,chapter:'reform',speaker:'Bula Exsurge Domine',prompt:'Restam sessenta dias. Você queimará seus livros e se retratará?',context:'Estudantes e cidadãos aguardam sua resposta fora dos muros.',left:{label:'Queimar os próprios livros',end:'bull'},right:{label:'Rejeitar a ameaça',next:'worms',mark:'witness'}},
    worms:{year:1521,chapter:'reform',speaker:'Dieta de Worms',prompt:'Diante do imperador: você revoga os livros que reconheceu como seus?',context:'Alguns atacam abusos, outros ensinam a fé, outros respondem a adversários.',left:{label:'Revogar',end:'worms'},right:{label:'Permanecer pela Escritura',next:'road',mark:'confession',codex:'worms',achievement:'confissao-worms'}},
    road:{year:1521,chapter:'reform',speaker:'Estrada para Wittenberg',prompt:'Cavaleiros mascarados cercam a carruagem. Você confia no plano de Frederico?',context:'O proscrito precisa desaparecer antes que agentes imperiais o encontrem.',left:{label:'Recusar a escolta',end:'road'},right:{label:'Ir para Wartburg',next:'wartburg',mark:'witness'}},
    wartburg:{year:1521,chapter:'reform',speaker:'Cavaleiro Jorge',prompt:'Escondido em Wartburg, como usar o exílio?',context:'O grego do Novo Testamento está aberto sobre a mesa.',left:{label:'Esperar em silêncio',end:'radicals'},right:{label:'Traduzir o Novo Testamento',next:'invocavit',mark:'scripture',codex:'wartburg',achievement:'confissao-wartburg'}},
    invocavit:{year:1522,chapter:'reform',speaker:'Wittenberg em desordem',prompt:'Mudanças violentas avançam sem ensino. Como detê-las?',context:'Você deixa o esconderijo e volta a pregar, ainda sob risco.',left:{label:'Abençoar a força',end:'radicals'},right:{label:'Pregar por oito dias',next:'hymns',mark:'witness',codex:'invocavit'}},
    hymns:{year:1524,chapter:'confession',speaker:'A comunidade canta',prompt:'A fé também será ensinada pela música do povo?',context:'Palavra, melodia e língua comum podem entrar juntas na memória.',left:{label:'Manter o canto distante',end:'radicals'},right:{label:'Escrever e publicar hinos',next:'peasants',mark:'witness'}},
    peasants:{year:1525,chapter:'confession',speaker:'Guerra dos Camponeses',prompt:'Camponeses invocam a liberdade cristã e príncipes respondem com exércitos. O que fazer?',context:'A justiça da causa não torna santa toda violência.',left:{label:'Santificar a revolta',end:'revolt'},right:{label:'Condenar opressão e violência',next:'marriage',mark:'confession'}},
    marriage:{year:1525,chapter:'confession',speaker:'Katharina von Bora',prompt:'O ex-monge e a ex-freira se casarão diante de todos?',context:'A decisão será doméstica, pastoral e pública.',left:{label:'Preservar a antiga imagem',end:'radicals'},right:{label:'Casar-se com Katharina',next:'visitations',mark:'witness',codex:'marriage'}},
    visitations:{year:1528,chapter:'confession',speaker:'Visitações na Saxônia',prompt:'Pastores e famílias mal conhecem o Credo e o Pai-Nosso. Qual resposta é necessária?',context:'A Reforma precisa chegar à mesa, à escola e ao púlpito.',left:{label:'Punir sem ensinar',end:'formula'},right:{label:'Preparar catecismos',next:'catechisms',mark:'scripture'}},
    catechisms:{year:1529,chapter:'confession',speaker:'Casa e paróquia',prompt:'Como organizar a instrução cristã cotidiana?',context:'Mandamentos, Credo, Pai-Nosso, Batismo, Confissão e Sacramento.',left:{label:'Somente para acadêmicos',end:'formula'},right:{label:'Para famílias e pastores',next:'marburg',mark:'confession',codex:'catechisms'}},
    marburg:{year:1529,chapter:'confession',speaker:'Colóquio de Marburgo',prompt:'Zwinglio propõe acordo político apesar da diferença sobre a Ceia. Você assinará ambiguidade?',context:'“Isto é o meu corpo” permanece escrito sobre a mesa.',left:{label:'Unir sem concordar',end:'marburg'},right:{label:'Confessar a presença real',next:'augsburg',mark:'confession',codex:'marburg'}},
    augsburg:{year:1530,chapter:'confession',speaker:'Fortaleza de Coburg',prompt:'Proscrito, você não pode ir à Dieta. Confiará a apresentação a Melanchthon?',context:'Cartas viajam entre Coburg e Augsburgo enquanto os artigos são refinados.',left:{label:'Impedir a apresentação',end:'formula'},right:{label:'Apoiar a Confissão',next:'bible',mark:'confession',codex:'augsburg'}},
    bible:{year:1534,chapter:'confession',speaker:'Oficina de tradução',prompt:'A Bíblia completa exige revisão coletiva. Você aceitará correções de língua e sentido?',context:'Hebraístas, helenistas, pastores e impressores trabalham juntos.',left:{label:'Tratar como obra individual',end:'formula'},right:{label:'Revisar em comunidade',next:'smalcald',mark:'scripture',codex:'bible'}},
    smalcald:{year:1537,chapter:'confession',speaker:'Artigos de Esmalcalda',prompt:'A saúde falha. Você registrará os pontos que não pode ceder?',context:'O concílio anunciado pode nunca ouvir sua voz pessoalmente.',left:{label:'Deixar tudo indefinido',end:'formula'},right:{label:'Escrever os artigos',next:'magdalena',mark:'confession'}},
    magdalena:{year:1542,chapter:'confession',speaker:'Quarto de Magdalena',prompt:'Sua filha morre aos treze anos. O que permanece quando a casa perde a voz dela?',context:'Dor sem teatro; esperança sem negar as lágrimas.',left:{label:'Esconder a dor',end:'formula'},right:{label:'Chorar e confessar esperança',next:'mansfeld',mark:'witness',codex:'magdalena'}},
    mansfeld:{year:1546,chapter:'confession',speaker:'Condes de Mansfeld',prompt:'Velho e doente, você viajará para reconciliar a disputa de sua terra natal?',context:'A última jornada retorna ao lugar do nascimento.',left:{label:'Recusar a mediação',end:'formula'},right:{label:'Viajar a Eisleben',next:'death',mark:'witness'}},
    death:{year:1546,chapter:'concord',speaker:'Eisleben',prompt:'A primeira testemunha encerra sua jornada. Quem guardará a confissão agora?',context:'Lutero morre em 18 de fevereiro. A história passa às mãos de outra geração.',left:{label:'Transformá-lo em relíquia',end:'formula'},right:{label:'Voltar aos textos e à Escritura',next:'war',mark:'scripture',codex:'death'}},
    war:{year:1547,chapter:'concord',speaker:'Batalha de Mühlberg',prompt:'A Liga de Esmalcalda é derrotada. A força imperial decidirá a doutrina?',context:'João Frederico perde o eleitorado e a pressão política aumenta.',left:{label:'Aceitar a decisão da espada',end:'interim'},right:{label:'Separar poder e confissão',next:'interim',mark:'confession'}},
    interim:{year:1548,chapter:'concord',speaker:'Interim de Augsburgo',prompt:'O imperador oferece ordem em troca de concessões. Você assinará?',context:'Pastores que resistem podem perder púlpito, casa e segurança.',left:{label:'Aceitar para ficar',end:'interim'},right:{label:'Recusar e suportar o exílio',next:'magdeburg',mark:'witness',codex:'interim'}},
    magdeburg:{year:1550,chapter:'concord',speaker:'Magdeburgo sitiada',prompt:'A cidade imprimirá uma confissão de resistência ao poder que persegue a fé?',context:'Prensas trabalham enquanto tropas cercam os muros.',left:{label:'Calar as prensas',end:'magdeburg'},right:{label:'Publicar a confissão',next:'osiander',mark:'confession'}},
    osiander:{year:1551,chapter:'concord',speaker:'Controvérsia osiandrista',prompt:'Nossa justiça diante de Deus é uma qualidade infundida em nós?',context:'A pergunta toca o próprio centro da justificação.',left:{label:'Sim, justiça interior',end:'osiander'},right:{label:'Não, por causa da obediência de Cristo',next:'major',mark:'scripture'}},
    major:{year:1552,chapter:'concord',speaker:'Controvérsia majorista',prompt:'Boas obras são necessárias para merecer ou condicionar a salvação?',context:'Frutos da fé não podem se tornar preço da graça.',left:{label:'São condição para salvar',end:'major'},right:{label:'São fruto, não mérito',next:'augsburgpeace',mark:'confession'}},
    augsburgpeace:{year:1555,chapter:'concord',speaker:'Paz de Augsburgo',prompt:'O acordo reconhece territórios luteranos, mas depende do príncipe. É a obra final?',context:'A paz política não resolve as divisões doutrinárias internas.',left:{label:'Declarar tudo resolvido',end:'formula'},right:{label:'Usar a paz para esclarecer',next:'synergy',mark:'witness'}},
    synergy:{year:1557,chapter:'concord',speaker:'Controvérsia sinergista',prompt:'Na conversão, a vontade humana coopera por uma capacidade espiritual própria?',context:'A resposta precisa preservar responsabilidade humana sem dividir a graça.',left:{label:'Atribuir cooperação própria',end:'synergy'},right:{label:'Confessar a obra do Espírito',next:'flacius',mark:'scripture'}},
    flacius:{year:1560,chapter:'concord',speaker:'Controvérsia flaciana',prompt:'O pecado original é a própria substância do ser humano?',context:'A corrupção é profunda, mas a criação de Deus não é idêntica ao pecado.',left:{label:'É a própria essência',end:'flacius'},right:{label:'É corrupção da natureza',next:'crypto',mark:'confession',codex:'controversies'}},
    crypto:{year:1574,chapter:'concord',speaker:'Cripto-calvinismo na Saxônia',prompt:'Uma doutrina reformada da Ceia pode ser escondida sob fórmulas luteranas?',context:'Assinatura pública e ensino secreto entram em choque.',left:{label:'Manter a linguagem dupla',end:'crypto'},right:{label:'Exigir confissão transparente',next:'torgau',mark:'confession'}},
    torgau:{year:1576,chapter:'concord',speaker:'Convenção de Torgau',prompt:'Andreae, Chemnitz e colegas reunirão documentos rivais em um texto revisável?',context:'O Livro de Torgau seguirá para pareceres de territórios e teólogos.',left:{label:'Impor uma facção',end:'formula'},right:{label:'Redigir e circular',next:'bergen',mark:'witness'}},
    bergen:{year:1577,chapter:'concord',speaker:'Mosteiro de Bergen',prompt:'Os pareceres chegaram. Você revisará o texto até distinguir tese e antítese?',context:'Nasce o Livro de Bergen: Epítome e Declaração Sólida.',left:{label:'Ignorar as objeções',end:'formula'},right:{label:'Revisar artigo por artigo',next:'subscriptions',mark:'scripture',codex:'formula'}},
    subscriptions:{year:1577,chapter:'concord',speaker:'Territórios luteranos',prompt:'A Fórmula será apenas decreto de príncipes ou confissão ensinada e assinada?',context:'Pastores, professores e autoridades examinam o documento.',left:{label:'Forçar sem ensinar',end:'formula'},right:{label:'Visitar, explicar e colher assinaturas',next:'book',mark:'witness'}},
    book:{year:1580,chapter:'exile',speaker:'Dresden, 25 de junho',prompt:'Cinquenta anos após Augsburgo, o Livro de Concórdia será publicado?',context:'Credos antigos e confissões da Reforma formam um só corpo documental.',left:{label:'Adiar para sempre',end:'formula'},right:{label:'Publicar o Livro',next:'prague',mark:'confession',codex:'book',achievement:'confissao-livro-concordia'}},
    prague:{year:1618,chapter:'exile',speaker:'Praga',prompt:'A liberdade religiosa é violada. Você tratará a violência como garantia da fé?',context:'A defenestração inicia uma revolta que se tornará guerra europeia.',left:{label:'Confiar na revolta armada',end:'bohemia'},right:{label:'Confessar sem santificar a violência',next:'whiteMountain',mark:'confession',codex:'bohemia'}},
    whiteMountain:{year:1620,chapter:'exile',speaker:'Após a Montanha Branca',prompt:'Converter-se, perder tudo ou partir. Você levará a confissão ao exílio?',context:'Propriedades são confiscadas; pastores e nobres recebem ordens de sair.',left:{label:'Converter-se para ficar',end:'conversion'},right:{label:'Partir com os livros',next:'westphalia',mark:'witness',achievement:'confissao-exilio'}},
    westphalia:{year:1648,chapter:'exile',speaker:'Paz de Vestfália',prompt:'A guerra termina. O que os exilados conservaram através das fronteiras?',context:'A casa foi perdida; a confissão atravessou a estrada.',left:{label:'Somente a derrota',end:'conversion'},right:{label:'Palavra, confissão e testemunho',end:'victory',mark:'witness',codex:'westphalia',achievement:'confissao-vitoria'}},
  };

  const defaultState = () => ({ current:'birth', started:false, completed:false, choices:[], visited:['birth'], codex:['eisleben'], marks:{scripture:0,confession:0,witness:0}, achievements:[], endings:[] });
  let state = defaultState();
  let dragging = false, choosing = false, startX = 0, currentX = 0, saveTimer = null, loaded = false;
  const $ = sel => document.querySelector(sel);
  const cardEl = $('#decision-card');
  const leftPreview = $('#choice-left');
  const rightPreview = $('#choice-right');

  function uniquePush(list, value){ if(value && !list.includes(value)) list.push(value); }
  function currentCard(){ return cards[state.current] || cards.birth; }
  function artFor(node){ return ART[node.chapter === 'youth' ? 'youth' : node.chapter === 'reform' || node.chapter === 'confession' ? 'reform' : node.chapter === 'concord' ? 'concord' : 'exile']; }
  function progress(){ return Math.min(100, (state.choices.length / TOTAL_CORE_CARDS) * 100); }
  function markAchievement(id){ if(!id || state.achievements.some(item => (typeof item==='string'?item:item?.id)===id)) return; state.achievements.push({id, unlockedAt:new Date().toISOString()}); }
  function updateStatus(text, bad=false){ const el=$('#save-status'); el.textContent=text; el.style.color=bad?'#bc655b':''; }
  function render(){
    const node = currentCard();
    $('#chapter-name').textContent = chapters[node.chapter];
    $('#year-label').textContent = node.year;
    $('#timeline-fill').style.width = `${progress()}%`;
    $('#scripture-count').textContent = state.marks.scripture;
    $('#confession-count').textContent = state.marks.confession;
    $('#witness-count').textContent = state.marks.witness;
    $('#choice-count').textContent = state.choices.length;
    $('#speaker').textContent = node.speaker;
    $('#prompt').textContent = node.prompt;
    $('#context').textContent = node.context;
    $('#card-stamp').textContent = `${chapters[node.chapter]} · ${node.year}`;
    $('#card-image').style.backgroundImage = `url('${artFor(node)}')`;
    leftPreview.querySelector('span').textContent = node.left.label;
    rightPreview.querySelector('span').textContent = node.right.label;
    cardEl.classList.remove('is-entering'); void cardEl.offsetWidth; cardEl.classList.add('is-entering');
    renderCodex();
  }

  function choose(side){
    if(choosing || !state.started) return;
    choosing = true;
    if(dragging) dragging=false;
    const node = currentCard();
    const option = node[side];
    state.choices.push({ node:state.current, year:node.year, prompt:node.prompt, side, label:option.label });
    if(option.mark) state.marks[option.mark] = (state.marks[option.mark] || 0) + 1;
    if(option.codex) uniquePush(state.codex, option.codex);
    if(option.achievement) markAchievement(option.achievement);
    const fly = side === 'left' ? -1 : 1;
    cardEl.style.transition='transform .28s ease-in, opacity .28s ease-in';
    cardEl.style.transform=`translateX(${fly*125}vw) rotate(${fly*24}deg)`;
    cardEl.style.opacity='0';
    hidePreviews();
    setTimeout(() => {
      cardEl.style.transition=''; cardEl.style.transform=''; cardEl.style.opacity='';
      choosing = false;
      if(option.end){ showEnding(option.end); return; }
      state.current = option.next;
      uniquePush(state.visited, option.next);
      render(); scheduleSave();
    }, 285);
  }

  function showEnding(id){
    const ending = endings[id];
    uniquePush(state.endings, id);
    state.completed = Boolean(ending.win);
    $('#ending-kicker').textContent = ending.win ? 'FINAL HISTÓRICO' : 'LINHA INTERROMPIDA';
    $('#ending-title').textContent = ending.title;
    $('#ending-body').textContent = ending.body;
    $('#ending-fact').textContent = ending.fact;
    $('#ending-art').style.backgroundImage = `url('${ART[ending.art]}')`;
    $('#ending-dialog').showModal();
    scheduleSave(true);
  }

  function reset(){
    choosing = false; dragging = false;
    state = defaultState(); state.started=true; markAchievement('confissao-primeira-jornada');
    $('#ending-dialog').close(); render(); scheduleSave(true);
  }

  function hidePreviews(){ leftPreview.classList.remove('visible'); rightPreview.classList.remove('visible'); }
  function moveCard(x){
    const width = Math.max(280, cardEl.offsetWidth);
    const ratio = Math.max(-1, Math.min(1, x / (width * .58)));
    cardEl.style.transition='none';
    cardEl.style.transform=`translateX(${x}px) rotate(${ratio*9}deg)`;
    cardEl.style.opacity=String(1-Math.abs(ratio)*.12);
    leftPreview.classList.toggle('visible', ratio < -.12);
    rightPreview.classList.toggle('visible', ratio > .12);
  }
  function releaseCard(){
    const threshold=Math.min(125,cardEl.offsetWidth*.28);
    if(Math.abs(currentX)>threshold){ choose(currentX<0?'left':'right'); return; }
    cardEl.style.transition='transform .25s ease, opacity .25s ease'; cardEl.style.transform=''; cardEl.style.opacity=''; hidePreviews();
  }
  cardEl.addEventListener('pointerdown', e => { if(e.button!==undefined&&e.button!==0)return; dragging=true; startX=e.clientX; currentX=0; cardEl.setPointerCapture?.(e.pointerId); });
  cardEl.addEventListener('pointermove', e => { if(!dragging)return; currentX=e.clientX-startX; moveCard(currentX); });
  cardEl.addEventListener('pointerup', () => { if(!dragging)return; dragging=false; releaseCard(); });
  cardEl.addEventListener('pointercancel', () => { dragging=false; currentX=0; releaseCard(); });
  document.addEventListener('keydown', e => { if($('dialog[open]'))return; if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a')choose('left'); if(e.key==='ArrowRight'||e.key.toLowerCase()==='d')choose('right'); });

  function renderCodex(){
    const groups=[...new Set(codex.map(x=>x.group))];
    const tabs=$('#codex-tabs'); const current=tabs.dataset.active||groups[0];
    tabs.innerHTML=groups.map(g=>`<button class="${g===current?'active':''}" data-group="${g}">${g}</button>`).join('');
    const entries=codex.filter(x=>x.group===current);
    $('#codex-content').innerHTML=entries.map(x=>{
      const unlocked=x.group==='Fontes'||state.codex.includes(x.id)||state.completed;
      return `<article class="codex-entry ${unlocked?'':'locked-entry'}"><span>${unlocked?x.year:'????'}</span><h3>${unlocked?x.title:'Registro não descoberto'}</h3><p>${unlocked?x.text:'Continue pela linha histórica para abrir este registro.'}</p></article>`;
    }).join('');
  }
  $('#codex-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(!b)return;$('#codex-tabs').dataset.active=b.dataset.group;renderCodex();});
  $('#open-codex').addEventListener('click',()=>{renderCodex();$('#codex-dialog').showModal();});
  $('#open-route').addEventListener('click',()=>{
    $('#route-list').innerHTML=state.choices.length?state.choices.slice().reverse().map(x=>`<article><b>${x.year}</b><div><strong>${x.label}</strong><p>${x.prompt}</p></div></article>`).join(''):'<p>Nenhuma decisão registrada ainda.</p>';
    $('#route-dialog').showModal();
  });
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));
  $('#restart-game').addEventListener('click',reset);
  $('#start-game').addEventListener('click',()=>{state.started=true;markAchievement('confissao-primeira-jornada');$('#intro-screen').classList.add('hidden');render();scheduleSave(true);});

  function validState(raw){
    if(!raw || typeof raw!=='object' || !cards[raw.current]) return null;
    return {...defaultState(),...raw,marks:{...defaultState().marks,...raw.marks},choices:Array.isArray(raw.choices)?raw.choices:[],visited:Array.isArray(raw.visited)?raw.visited:['birth'],codex:Array.isArray(raw.codex)?raw.codex:['eisleben'],achievements:Array.isArray(raw.achievements)?raw.achievements:[],endings:Array.isArray(raw.endings)?raw.endings:[]};
  }
  async function saveNow(){
    if(!loaded)return;
    clearTimeout(saveTimer);
    if(location.protocol==='file:'){localStorage.setItem('a-confissao-static-save',JSON.stringify(state));updateStatus('Prévia local');return;}
    try{const response=await fetch(API,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,achievements:state.achievements})});if(!response.ok)throw new Error();updateStatus('Salvo no perfil');}
    catch{updateStatus('Falha ao salvar',true);}
  }
  function scheduleSave(now=false){clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,now?0:450);}
  async function boot(){
    try{
      if(location.protocol==='file:'){state=validState(JSON.parse(localStorage.getItem('a-confissao-static-save')||'null'))||defaultState();}
      else {const response=await fetch(API,{cache:'no-store'});if(!response.ok)throw new Error();const payload=await response.json();state=validState(payload.state)||defaultState();}
      loaded=true; updateStatus(location.protocol==='file:'?'Prévia local':'Perfil conectado');
    }catch{state=defaultState();loaded=true;updateStatus('Nova jornada');}
    $('#intro-screen').classList.toggle('hidden',state.started);
    render();
  }
  window.addEventListener('beforeunload',()=>{if(location.protocol==='file:')localStorage.setItem('a-confissao-static-save',JSON.stringify(state));else navigator.sendBeacon?.(API,JSON.stringify({state,achievements:state.achievements}));});
  boot();
})();
