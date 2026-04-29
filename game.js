const NS='http://www.w3.org/2000/svg';
const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const STATES={
  RR:{name:'Roraima',x:63200,y:18375},
  AP:{name:'Amapá',x:108086,y:19581},
  AM:{name:'Amazonas',x:48538,y:45867},
  PA:{name:'Pará',x:107604,y:45079},
  AC:{name:'Acre',x:23169,y:71975},
  RO:{name:'Rondônia',x:56416,y:80287},
  MT:{name:'Mato Grosso',x:91270,y:89386},
  MS:{name:'Mato Grosso do Sul',x:97813,y:128066},
  GO:{name:'Goiás',x:121333,y:105254},
  DF:{name:'Distrito Federal',x:129790,y:104434},
  TO:{name:'Tocantins',x:127780,y:72891},
  MA:{name:'Maranhão',x:141735,y:54998},
  PI:{name:'Piauí',x:151638,y:60770},
  CE:{name:'Ceará',x:169853,y:53374},
  RN:{name:'Rio Grande do Norte',x:181974,y:56236},
  PB:{name:'Paraíba',x:181958,y:62377},
  PE:{name:'Pernambuco',x:175785,y:68309},
  AL:{name:'Alagoas',x:182360,y:74563},
  SE:{name:'Sergipe',x:179402,y:78872},
  BA:{name:'Bahia',x:157345,y:93035},
  MG:{name:'Minas Gerais',x:140883,y:118099},
  ES:{name:'Espírito Santo',x:163052,y:123083},
  RJ:{name:'Rio de Janeiro',x:152860,y:135140},
  SP:{name:'São Paulo',x:125803,y:137487},
  PR:{name:'Paraná',x:113086,y:147583},
  SC:{name:'Santa Catarina',x:114147,y:162422},
  RS:{name:'Rio Grande do Sul',x:101977,y:175927}
};

// Posições visuais dos marcadores: o clique continua usando o path real do estado,
// mas bolinhas usam pontos ajustados para ficarem dentro do território visível.
const MARKER_POS={
  RJ:{x:155800,y:133700},
  SC:{x:118800,y:158900},
  ES:{x:164900,y:121000},
  DF:{x:129650,y:104250},
  SE:{x:178000,y:79200},
  AL:{x:181000,y:74200},
  PB:{x:180800,y:62600},
  RN:{x:181000,y:56500},
  AP:{x:108500,y:22000},
  RR:{x:63500,y:20500}
};
const MARKER_SLOTS_DEFAULT=[
  [0,0],[-2600,-1600],[2600,-1600],[-2600,1600],[2600,1600],[0,-3200],[0,3200],[-4200,0],[4200,0]
];
const MARKER_SLOTS={
  CE:[[0,0],[2800,-1800],[2800,1800],[5600,-2700],[5600,0],[5600,2700],[8300,-1400],[8300,1400]],
  RN:[[0,0],[2600,-1500],[2600,1500],[5200,-2200],[5200,0],[5200,2200]],
  PB:[[0,0],[2600,-1500],[2600,1500],[5200,-2200],[5200,0],[5200,2200]],
  PE:[[0,0],[3000,-1500],[3000,1500],[6000,-2400],[6000,0],[6000,2400],[9000,0]],
  AL:[[0,0],[2600,-1500],[2600,1500],[5200,-2100],[5200,500],[7600,-800]],
  SE:[[0,0],[2400,-1400],[2400,1400],[4800,0],[6800,-1200]],
  RJ:[[0,0],[3300,1200],[5200,-1200],[6500,1500],[-2300,-1400]],
  SC:[[0,0],[-2400,-1400],[2400,-1400],[-2400,1400],[2400,1400],[0,3000]],
  ES:[[0,0],[2600,-1500],[2600,1500],[5200,-2200],[5200,0],[5200,2200]]
};

const STATE_POP={RS:1150,SC:320,PR:350,SP:2280,RJ:1120,ES:210,MG:3590,BA:2120,SE:150,AL:300,PE:1030,PB:460,RN:360,CE:850,PI:330,MA:570,PA:450,AM:250,RR:20,AP:25,TO:80,GO:230,MT:140,MS:120,RO:30,AC:40,DF:50};
const STATE_MULTI={RS:{fe:1.0,of:1.2,receptivity:1.18,urban:0.7},SC:{fe:1.1,of:1.1,receptivity:1.14,urban:0.75},PR:{fe:1.1,of:1.1,receptivity:1.1,urban:0.85},SP:{fe:0.6,of:2.0,receptivity:0.82,urban:1.45},RJ:{fe:0.6,of:1.8,receptivity:0.84,urban:1.45},ES:{fe:0.9,of:1.0,receptivity:0.95,urban:1.0},MG:{fe:0.9,of:1.1,receptivity:0.92,urban:1.0},BA:{fe:1.0,of:0.9,receptivity:1.0,urban:0.95},SE:{fe:1.3,of:0.8,receptivity:1.12,urban:0.9},AL:{fe:1.3,of:0.8,receptivity:1.1,urban:0.9},PE:{fe:1.0,of:0.9,receptivity:1.0,urban:1.05},PB:{fe:1.4,of:0.7,receptivity:1.16,urban:0.85},RN:{fe:1.4,of:0.7,receptivity:1.16,urban:0.85},CE:{fe:1.1,of:0.8,receptivity:1.06,urban:0.95},PI:{fe:1.6,of:0.6,receptivity:1.24,urban:0.7},MA:{fe:1.5,of:0.6,receptivity:1.2,urban:0.75},PA:{fe:1.7,of:0.6,receptivity:1.25,urban:0.85},AM:{fe:2.0,of:0.5,receptivity:1.3,urban:0.75},RR:{fe:3.0,of:0.4,receptivity:1.4,urban:0.55},AP:{fe:2.8,of:0.4,receptivity:1.35,urban:0.6},TO:{fe:2.0,of:0.5,receptivity:1.28,urban:0.65},GO:{fe:1.3,of:0.8,receptivity:1.08,urban:1.0},MT:{fe:1.8,of:0.5,receptivity:1.22,urban:0.75},MS:{fe:1.5,of:0.6,receptivity:1.16,urban:0.75},RO:{fe:2.5,of:0.4,receptivity:1.35,urban:0.6},AC:{fe:2.8,of:0.4,receptivity:1.38,urban:0.55},DF:{fe:0.7,of:1.5,receptivity:0.9,urban:1.55}};

const DENOMS={
  IELB:{name:'IELB',color:'#1565c0',startYear:1904,startState:'RS',identity:1.22,profile:'player',growth:1.0,resource:0},
  CAT:{name:'Católica',color:'#a89060',startYear:1500,startState:'ALL',identity:1.04,profile:'historic',growth:0.18,resource:0,historical:0.95},
  PRESB:{name:'Presbiteriana',color:'#33691e',startYear:1862,startState:'RJ',identity:1.05,profile:'moderate',growth:0.72,resource:0},
  BAT:{name:'Batista',color:'#6d4c41',startYear:1882,startState:'BA',identity:1.0,profile:'moderate',growth:0.78,resource:0},
  ADV:{name:'Adventista',color:'#e65100',startYear:1895,startState:'SC',identity:1.02,profile:'moderate',growth:0.74,resource:0},
  CCB:{name:'CCB',color:'#6a1b9a',startYear:1910,startState:'PR',identity:0.95,profile:'fast',growth:0.82,resource:0},
  AD:{name:'Assembleia de Deus',color:'#c62828',startYear:1911,startState:'PA',identity:0.9,profile:'pentecostal',growth:0.92,resource:0},
  IECLB:{name:'IECLB',color:'#00a884',startYear:1949,startState:'RS',identity:0.98,profile:'moderate',growth:0.55,resource:0},
  IURD:{name:'Universal',color:'#f9a825',startYear:1977,startState:'RJ',identity:0.78,profile:'aggressive',growth:1.45,resource:0},
  PP:{name:'Parede Preta',color:'#444444',startYear:2005,startState:'SP',identity:0.85,profile:'late',growth:0.85,resource:0}
};

const ALL_STATES=Object.keys(STATES);
const STATE_CITIES={
  RS:['São Leopoldo','Porto Alegre','Novo Hamburgo','Santa Cruz do Sul','Caxias do Sul','Pelotas','Chuí','Santa Rosa','Lajeado','Ijuí','Passo Fundo','Canoas','Gravataí','Viamão','São Borja','Uruguaiana','Bagé','Rio Grande','Erechim','Santo Ângelo'],
  SC:['Blumenau','Joinville','Florianópolis','Itajaí','Chapecó','Lages','Criciúma','Jaraguá do Sul','São José','Brusque','Balneário Camboriú','Tubarão'],
  PR:['Curitiba','Londrina','Maringá','Ponta Grossa','Cascavel','São José dos Pinhais','Foz do Iguaçu','Guarapuava','Paranaguá','Toledo','Apucarana','Pato Branco','Ivaiporã'],
  SP:['São Paulo','Campinas','Santo André','Ribeirão Preto','Santos','Sorocaba','São Bernardo do Campo','São José dos Campos','Osasco','Bauru','Piracicaba','Jundiaí','Limeira'],
  RJ:['Rio de Janeiro','Niterói','Petrópolis','Nova Iguaçu','Duque de Caxias','São Gonçalo','Campos dos Goytacazes','Volta Redonda','Macaé','Cabo Frio'],
  MG:['Belo Horizonte','Uberlândia','Juiz de Fora','Contagem','Montes Claros','Betim','Ribeirão das Neves','Uberaba','Governador Valadares','Ipatinga','Divinópolis'],
  ES:['Vitória','Vila Velha','Serra','Cachoeiro de Itapemirim','Cariacica','Linhares','Colatina','Guarapari','São Mateus','Aracruz'],
  BA:['Salvador','Feira de Santana','Vitória da Conquista','Camaçari','Itabuna','Juazeiro','Lauro de Freitas','Ilhéus','Jequié','Barreiras','Xique-Xique'],
  GO:['Goiânia','Aparecida de Goiânia','Anápolis','Rio Verde','Luziânia','Águas Lindas de Goiás','Valparaíso de Goiás','Trindade','Formosa','Itumbiara'],
  DF:['Brasília','Taguatinga','Ceilândia','Samambaia','Planaltina','Gama','Sobradinho','Guará','Recanto das Emas','Santa Maria'],
  MT:['Cuiabá','Várzea Grande','Rondonópolis','Sinop','Tangará da Serra','Cáceres','Sorriso','Lucas do Rio Verde','Primavera do Leste','Barra do Garças'],
  MS:['Campo Grande','Dourados','Corumbá','Três Lagoas','Ponta Porã','Naviraí','Nova Andradina','Aquidauana','Maracaju','Paranaíba'],
  TO:['Palmas','Araguaína','Gurupi','Porto Nacional','Paraíso do Tocantins','Colinas do Tocantins','Guaraí','Tocantinópolis','Dianópolis','Miracema do Tocantins'],
  MA:['São Luís','Imperatriz','Timon','Caxias','Codó','Paço do Lumiar','Açailândia','Bacabal','Balsas','Santa Inês'],
  PI:['Teresina','Parnaíba','Picos','Floriano','Piripiri','Campo Maior','Barras','União','Altos','Pedro II'],
  CE:['Fortaleza','Caucaia','Juazeiro do Norte','Maracanaú','Sobral','Crato','Itapipoca','Maranguape','Iguatu','Quixadá'],
  RN:['Natal','Mossoró','Caicó','Parnamirim','São Gonçalo do Amarante','Macaíba','Ceará-Mirim','Assu','Currais Novos','Santa Cruz'],
  PB:['João Pessoa','Campina Grande','Patos','Santa Rita','Bayeux','Sousa','Cajazeiras','Cabedelo','Guarabira','Sapé','Pombal'],
  PE:['Recife','Caruaru','Petrolina','Jaboatão dos Guararapes','Olinda','Paulista','Cabo de Santo Agostinho','Camaragibe','Garanhuns','Vitória de Santo Antão'],
  AL:['Maceió','Arapiraca','Palmeira dos Índios','Rio Largo','União dos Palmares','Penedo','São Miguel dos Campos','Coruripe','Delmiro Gouveia','Santana do Ipanema'],
  SE:['Aracaju','Nossa Senhora do Socorro','Lagarto','Itabaiana','São Cristóvão','Estância','Tobias Barreto','Simão Dias','Propriá','Barra dos Coqueiros'],
  AM:['Manaus','Parintins','Itacoatiara','Manacapuru','Coari','Tefé','Tabatinga','Maués','Iranduba','Humaitá'],
  PA:['Belém','Ananindeua','Santarém','Marabá','Parauapebas','Castanhal','Abaetetuba','Cametá','Bragança','Altamira'],
  RO:['Porto Velho','Ji-Paraná','Ariquemes','Vilhena','Cacoal','Rolim de Moura','Jaru','Guajará-Mirim','Machadinho d’Oeste','Ouro Preto do Oeste'],
  AC:['Rio Branco','Cruzeiro do Sul','Sena Madureira','Tarauacá','Feijó','Brasiléia','Senador Guiomard','Plácido de Castro','Xapuri','Mâncio Lima'],
  AP:['Macapá','Santana','Laranjal do Jari','Oiapoque','Mazagão','Porto Grande','Tartarugalzinho','Pedra Branca do Amapari','Vitória do Jari','Calçoene'],
  RR:['Boa Vista','Rorainópolis','Caracaraí','Alto Alegre','Mucajaí','Cantá','Pacaraima','Bonfim','Amajari','Normandia']
};
const CITY_COORDS={
  RS:{
    'São Leopoldo':[-29.76,-51.15], 'Porto Alegre':[-30.03,-51.23], 'Novo Hamburgo':[-29.68,-51.13],
    'Santa Cruz do Sul':[-29.72,-52.43], 'Caxias do Sul':[-29.17,-51.18], 'Pelotas':[-31.77,-52.34],
    'Chuí':[-33.69,-53.46], 'Santa Rosa':[-27.87,-54.48], 'Lajeado':[-29.47,-51.96],
    'Ijuí':[-28.39,-53.92], 'Passo Fundo':[-28.26,-52.41]
  },
  SC:{'Blumenau':[-26.92,-49.07], 'Joinville':[-26.30,-48.85], 'Florianópolis':[-27.59,-48.55], 'Itajaí':[-26.91,-48.67], 'Chapecó':[-27.10,-52.62], 'Lages':[-27.82,-50.33], 'Criciúma':[-28.68,-49.37], 'Jaraguá do Sul':[-26.49,-49.07]},
  PR:{'Curitiba':[-25.43,-49.27], 'Londrina':[-23.31,-51.16], 'Maringá':[-23.42,-51.93], 'Ponta Grossa':[-25.09,-50.16], 'Cascavel':[-24.96,-53.46], 'São José dos Pinhais':[-25.53,-49.21]},
  SP:{'São Paulo':[-23.55,-46.63], 'Campinas':[-22.91,-47.06], 'Santo André':[-23.66,-46.53], 'Ribeirão Preto':[-21.17,-47.81], 'Santos':[-23.96,-46.33], 'Sorocaba':[-23.50,-47.46]},
  RJ:{'Rio de Janeiro':[-22.91,-43.17], 'Niterói':[-22.88,-43.10], 'Petrópolis':[-22.51,-43.18], 'Nova Iguaçu':[-22.76,-43.45]},
  MG:{'Belo Horizonte':[-19.92,-43.94], 'Uberlândia':[-18.91,-48.28], 'Juiz de Fora':[-21.76,-43.35], 'Contagem':[-19.93,-44.05], 'Montes Claros':[-16.73,-43.86]},
  ES:{'Vitória':[-20.32,-40.34], 'Vila Velha':[-20.35,-40.29], 'Serra':[-20.12,-40.31], 'Cachoeiro de Itapemirim':[-20.85,-41.11]},
  BA:{'Salvador':[-12.97,-38.50], 'Feira de Santana':[-12.27,-38.96], 'Vitória da Conquista':[-14.86,-40.84]},
  GO:{'Goiânia':[-16.68,-49.25], 'Aparecida de Goiânia':[-16.82,-49.24], 'Anápolis':[-16.33,-48.95]},
  DF:{'Brasília':[-15.78,-47.93], 'Taguatinga':[-15.83,-48.06], 'Ceilândia':[-15.82,-48.11]},
  MT:{'Cuiabá':[-15.60,-56.10], 'Várzea Grande':[-15.65,-56.13], 'Rondonópolis':[-16.47,-54.64]},
  MS:{'Campo Grande':[-20.47,-54.62], 'Dourados':[-22.22,-54.81], 'Corumbá':[-19.01,-57.65]},
  TO:{'Palmas':[-10.18,-48.33], 'Araguaína':[-7.19,-48.21], 'Gurupi':[-11.73,-49.07]},
  MA:{'São Luís':[-2.53,-44.30], 'Imperatriz':[-5.52,-47.49], 'Timon':[-5.10,-42.84]},
  PI:{'Teresina':[-5.09,-42.80], 'Parnaíba':[-2.90,-41.78], 'Picos':[-7.08,-41.47]},
  CE:{'Fortaleza':[-3.73,-38.52], 'Caucaia':[-3.73,-38.66], 'Juazeiro do Norte':[-7.21,-39.32]},
  RN:{'Natal':[-5.79,-35.21], 'Mossoró':[-5.19,-37.34], 'Caicó':[-6.46,-37.10]},
  PB:{'João Pessoa':[-7.12,-34.86], 'Campina Grande':[-7.23,-35.88], 'Patos':[-7.02,-37.28]},
  PE:{'Recife':[-8.05,-34.88], 'Caruaru':[-8.28,-35.98], 'Petrolina':[-9.39,-40.50]},
  AL:{'Maceió':[-9.65,-35.73], 'Arapiraca':[-9.75,-36.66], 'Palmeira dos Índios':[-9.41,-36.63]},
  SE:{'Aracaju':[-10.91,-37.07], 'Nossa Senhora do Socorro':[-10.86,-37.13], 'Lagarto':[-10.92,-37.65]},
  AM:{'Manaus':[-3.12,-60.02], 'Parintins':[-2.63,-56.74], 'Itacoatiara':[-3.14,-58.44]},
  PA:{'Belém':[-1.45,-48.49], 'Ananindeua':[-1.36,-48.37], 'Santarém':[-2.44,-54.71]},
  RO:{'Porto Velho':[-8.76,-63.90], 'Ji-Paraná':[-10.88,-61.95], 'Ariquemes':[-9.91,-63.03]},
  AC:{'Rio Branco':[-9.97,-67.81], 'Cruzeiro do Sul':[-7.63,-72.67], 'Sena Madureira':[-9.07,-68.66]},
  AP:{'Macapá':[0.03,-51.07], 'Santana':[-0.06,-51.18], 'Laranjal do Jari':[-0.84,-52.51]},
  RR:{'Boa Vista':[2.82,-60.67], 'Rorainópolis':[0.94,-60.43], 'Caracaraí':[1.82,-61.13]}
};
const DENOM_KEYS=Object.keys(DENOMS);
const ECONOMY_SCALE=0.75;
const MISSION_MONTHS=10;
const PLAYER_PLANT_COOLDOWN=6;
const PLAYER_MISSION_COOLDOWN=4;
const RIVAL_ORGANIC_SCALE=0.065;
const EXTRA_CHURCH_DIMINISH=0.72;
const PLAYER_CHURCH_UPKEEP=0.32;
const PLAYER_MEMBER_CARE_UPKEEP=0.00045;
const OFFER_ROOT_GAIN=0.017;
const FAITH_ROOT_GAIN=0.085;
const BASE_SUPPORT=0.42;
const EARLY_MISSION_SUPPORT=0.35;
const STATE_STRUCTURE_UPKEEP=0.25;
const ADMIN_OVERLOAD_UPKEEP=0.45;
const PASTOR_SEND_COST=40;
const PLAYER_EXPANSION_COST=40;
const SEMINARY_MONTHLY_COST=0.5;
const SEMINARY_SUBSIDY_PER_STUDENT=0.15;
const SEMINARY_YEARS=7;
const CHURCH_SUBSIDY_MONTHS=60;

// eventos revisados: decisões sem gabarito visível antes do clique e efeitos ligados a G.mods.
const EVENTS=[
  {year:1903,month:9,tag:'MARCO',type:'good',title:'Instituto em Bom Jesus',yr:'1903',txt:'O Instituto em Bom Jesus antecede o Seminário Concórdia e busca formar pastores e professores para a obra luterana no Brasil.',choices:[{label:'Apoiar a formação inicial',result:'A formação pastoral futura fica mais forte.',effect(){G.mods.pastoralFormation+=0.08;G.fe+=12;}}]},
  {year:1904,month:6,tag:'FUNDAÇÃO',type:'good',title:'Fundação da IELB',yr:'24 de junho de 1904, São Pedro do Sul',txt:'A IELB é fundada como distrito brasileiro do Sínodo de Missouri, com base confessional no Rio Grande do Sul.',choices:[{label:'Firmar a base confessional no RS',result:'Fé, doutrina e base regional fortalecidas.',effect(){G.fe+=30;G.of+=15;G.doc+=5;G.mods.doctrineGrowth+=0.04;}}]},
  {year:1905,month:2,tag:'DECISÃO',type:'warn',title:'Decisão sobre a formação pastoral',yr:'1905',txt:'O seminário enfrenta dificuldades após o retorno de Hartmeister aos EUA. Sem formação local, a expansão perde fôlego.',choices:[{label:'Investir na reabertura e formação local',correct:true,result:'Decisão confessional correta. A decisão prepara a transferência e a primeira turma regular em 1908, que se formará após sete anos.',effect(){G.of=Math.max(0,G.of-5);G.fe+=20;G.doc+=8;G.mods.pastoralFormation+=0.16;planSeminaryOpening('strong');}},{label:'Adiar até haver mais recursos',correct:false,result:'Decisão problemática. A obra evita um gasto maior, mas o seminário será reaberto mesmo assim em formato mínimo: uma pequena sala de aula, porque as pessoas precisam conhecer a Deus.',effect(){G.fe-=4;G.mods.pastoralFormation=Math.max(0.88,G.mods.pastoralFormation-0.04);planSeminaryOpening('small');}}]},
  {year:1907,month:5,tag:'MARCO',type:'good',title:'Reabertura em Porto Alegre',yr:'1º de maio de 1907',txt:'O seminário é reaberto em Porto Alegre, melhorando a formação de pastores para a IELB.',choices:[{label:'Fortalecer o seminário',result:'Formação pastoral fortalecida.',effect(){G.fe+=18;G.mods.pastoralFormation+=0.12;}}]},
  {year:1908,month:4,tag:'MARCO',type:'good',title:'Nome Seminário Concórdia',yr:'1908',txt:'O seminário recebe o nome Seminário Concórdia, consolidando sua identidade teológica.',choices:[{label:'Celebrar a identidade confessional',result:'Doutrina e formação recebem bônus.',effect(){G.doc+=6;G.mods.doctrineGrowth+=0.04;G.mods.pastoralFormation+=0.06;}}]},
  {year:1914,month:8,tag:'CRISE',type:'bad',title:'Guerra e perseguição',yr:'1914',txt:'Comunidades luteranas de origem alemã sofrem pressão, suspeita e perseguição. O uso do alemão é restringido e surge a necessidade de evangelização em português.',choices:[{label:'Adaptar cultos e evangelização também ao português',correct:true,result:'Decisão confessional correta. A pressão é real, mas o alcance futuro melhora.',effect(){G.fe+=10;G.mods.missionGrowth+=0.12;G.mods.persecutionPressure+=0.12;}},{label:'Manter apenas o alemão',correct:false,result:'Decisão problemática. A identidade cultural fica preservada, mas o crescimento e a segurança sofrem.',effect(){G.fe-=12;G.mods.missionGrowth=Math.max(0.75,G.mods.missionGrowth-0.12);G.mods.persecutionPressure+=0.24;}}]},
  {year:1915,month:1,tag:'SEMINÁRIO',type:'good',title:'Primeiros pastores formados',yr:'1915',pastorRoster:true,txt:'O Seminário Concórdia forma a primeira turma de pastores da IELB. Eles agora estão disponíveis para novos campos missionários.',choices:[{label:'Receber os pastores formados',result:'Expansão e formação pastoral melhoram.',effect(){G.fe+=25;G.of+=10;G.mods.pastoralFormation+=0.1;}}]},
  {year:1925,month:6,tag:'MARCO',type:'good',title:'Fundação da JELB',yr:'1925',txt:'A Juventude Evangélica Luterana do Brasil fortalece jovens, membros e retenção congregacional.',choices:[{label:'Organizar a juventude luterana',result:'Retenção de jovens e crescimento de membros melhoram.',effect(){G.fi+=20;G.mods.youthRetention+=0.16;}}]},
  {year:1937,month:9,tag:'MARCO',type:'good',title:'Hora Luterana no Brasil',yr:'1937',txt:'A Hora Luterana fortalece a evangelização por rádio e amplia a visibilidade da mensagem.',choices:[{label:'Usar o rádio para evangelização',result:'Crescimento missionário nacional fortalecido.',effect(){G.fe+=20;G.mods.missionGrowth+=0.15;}}]},
  {year:1938,month:4,tag:'CRISE',type:'bad',title:'Nacionalização de Vargas',yr:'1937-1938',txt:'Escolas são fechadas, pessoas presas, templos profanados e livros ou equipamentos confiscados. A pressão força adaptação ao português.',choices:[{label:'Consolidar a transição para o português',correct:true,result:'Decisão confessional correta. Há perdas temporárias, mas o alcance nacional melhora.',effect(){G.fe-=8;G.of=Math.max(0,G.of-8);G.mods.persecutionPressure+=0.18;G.mods.missionGrowth+=0.14;}},{label:'Resistir sem adaptação pública',correct:false,result:'Decisão problemática. A vulnerabilidade aumenta e o crescimento cai.',effect(){G.fe-=20;G.fi=Math.max(0,G.fi-10);G.mods.persecutionPressure+=0.32;G.mods.missionGrowth=Math.max(0.75,G.mods.missionGrowth-0.12);}}]},
  {year:1956,month:7,tag:'MARCO',type:'good',title:'Liga de Servas Luteranas',yr:'1956',txt:'A Liga de Servas Luteranas fortalece diaconia, fé e retenção nas comunidades.',choices:[{label:'Servir com alegria',result:'Diaconia e retenção fortalecidas.',effect(){G.fe+=20;G.fi+=25;G.mods.youthRetention+=0.08;}}]},
  {year:1971,month:1,tag:'MARCO',type:'good',title:'Liga de Leigos Luteranos',yr:'1971',txt:'A liderança leiga organizada fortalece a expansão e o serviço congregacional.',choices:[{label:'Fortalecer a liderança leiga',result:'Expansão e missão melhoram.',effect(){G.fe+=15;G.fi+=20;G.mods.missionGrowth+=0.08;}}]},
  {year:1980,month:6,tag:'MARCO',type:'good',title:'IELB torna-se igreja autônoma',yr:'1980',txt:'A IELB torna-se igreja autônoma, com identidade nacional e comunhão confessional.',choices:[{label:'Assumir a missão nacional',result:'Identidade e expansão nacional recebem bônus.',effect(){G.fe+=30;G.of+=20;G.fi+=30;G.doc+=5;G.mods.missionGrowth+=0.12;G.mods.doctrineGrowth+=0.04;}}]},
  {year:1984,month:3,tag:'MARCO',type:'good',title:'Seminário vai para São Leopoldo',yr:'1984',txt:'A mudança fortalece a formação teológica e o crescimento pastoral.',choices:[{label:'Fortalecer a formação teológica',result:'Formação pastoral ganha novo impulso.',effect(){G.doc+=5;G.mods.pastoralFormation+=0.12;}}]},
  {year:2017,month:10,tag:'JUBILEU',type:'good',title:'500 anos da Reforma',yr:'2017',txt:'A IELB celebra os 500 anos da Reforma, reforçando doutrina, fé e visibilidade pública.',choices:[{label:'Celebrar a graça de Deus em Cristo',result:'Doutrina, fé e visibilidade fortalecidas.',effect(){G.fe+=50;G.fi+=40;G.of+=30;G.doc+=10;G.mods.doctrineGrowth+=0.08;G.mods.missionGrowth+=0.08;}}]}
];

const THEOLOGY_QUESTIONS=[
  {id:'Q01',q:'O que o Primeiro Mandamento exige de nós?',a:['Que oremos todo dia e participemos dos cultos regularmente','Que temamos, amemos e confiemos em Deus acima de todas as coisas','Que sejamos pessoas boas e ajudemos o próximo'],correct:1},
  {id:'Q02',q:'O que confessamos no Primeiro Artigo do Credo sobre Deus Pai?',a:['Que Deus criou o mundo e agora observa de longe o que acontece','Que Deus Pai governa o mundo pelas leis da natureza','Que Deus Pai nos criou junto com todas as criaturas e ainda hoje cuida de nós e nos sustenta'],correct:2},
  {id:'Q03',q:'O que confessamos no Segundo Artigo do Credo sobre Jesus Cristo?',a:['Que Jesus foi o maior exemplo de amor e bondade que já existiu','Que Jesus veio ao mundo para nos ensinar a viver de forma correta','Que Jesus é o único Filho de Deus que nos salvou do pecado, da morte e do poder do diabo com seu sangue'],correct:2},
  {id:'Q04',q:'O que confessamos no Terceiro Artigo do Credo sobre o Espírito Santo?',a:['Que o Espírito Santo nos traz à fé por visões e experiências fortes','Que o Espírito Santo age direto no coração sem precisar de nenhum meio externo','Que o Espírito Santo nos chama à fé pela pregação do Evangelho, nos ilumina e nos santifica'],correct:2},
  {id:'Q05',q:'Como somos salvos segundo o ensino luterano?',a:['Pela fé e pelas boas obras juntas','Pela fé, mas precisamos manter a salvação com nossas obras','Pela fé em Cristo — nenhuma obra ou esforço nosso tem mérito na salvação'],correct:2},
  {id:'Q06',q:'O que pedimos na Quarta Petição do Pai Nosso — "o pão nosso de cada dia dá-nos hoje"?',a:['Só comida e bebida para não passar necessidade','Riqueza e prosperidade para nossa família','Tudo o que precisamos para viver — comida, saúde, trabalho, família e paz'],correct:2},
  {id:'Q07',q:'O que pedimos na Quinta Petição — "perdoa as nossas dívidas assim como nós perdoamos aos nossos devedores"?',a:['Que Deus nos perdoe conforme o esforço que fazemos para melhorar','Que Deus nos perdoe independentemente de como tratamos os outros','Que Deus nos perdoe completamente por causa de Cristo, reconhecendo que também precisamos perdoar quem nos ofendeu'],correct:2},
  {id:'Q08',q:'O que pedimos na Sexta Petição — "não nos deixes cair em tentação"?',a:['Que Deus tire todas as tentações da nossa vida','Que Deus destrua o diabo antes que ele nos tente','Que Deus nos ajude quando a tentação vier, para que não cedamos a ela'],correct:2},
  {id:'Q09',q:'O que é o Batismo segundo o ensino luterano?',a:['Um símbolo público da nossa decisão de seguir Jesus','Um ritual de entrada na comunidade sem poder de salvar','Um sacramento pelo qual Deus concede sua graça, dando o perdão dos pecados e a salvação a quem recebe pela fé'],correct:2},
  {id:'Q10',q:'Por que batizamos crianças?',a:['Para protegê-las espiritualmente até que possam decidir por si mesmas','Porque crianças já têm fé e assim podem crer em Deus e aceitar Jesus','Porque o Batismo é obra de Deus, não da nossa decisão — e Deus age também nas crianças, recebendo-as em sua graça'],correct:2},
  {id:'Q11',q:'Qual é a visão luterana sobre a presença de Cristo na Santa Ceia?',a:['O pão e o vinho são símbolos que representam o corpo e sangue de Cristo','O pão e o vinho se transformam completamente no corpo e sangue de Cristo','O verdadeiro corpo e sangue de Cristo estão presentes sob o pão e o vinho'],correct:2},
  {id:'Q12',q:'O que a Santa Ceia nos dá?',a:['Um momento de reflexão sobre a morte de Jesus','Uma bênção especial para quem a recebe com frequência','Perdão dos pecados, vida e salvação, oferecidos por Cristo no próprio sacramento'],correct:2},
  {id:'Q13',q:'Para que foram criados os sacramentos?',a:['Para mostrar publicamente quem pertence à Igreja cristã','Para substituir a pregação da Palavra quando ela não é possível','Para serem sinais concretos da vontade de Deus para conosco, despertando e fortalecendo a fé'],correct:2},
  {id:'Q14',q:'O que diferencia o luteranismo de uma religião que ensina "faça o bem e será salvo"?',a:['O luteranismo exige ainda mais boas obras do que essas religiões','O luteranismo ensina que as boas obras não têm nenhuma importância','O luteranismo ensina que somos salvos pelo que Cristo fez por nós — as boas obras são fruto da fé, não o que nos salva'],correct:2},
  {id:'Q15',q:'O que os luteranos creem sobre a predestinação?',a:['Que Deus escolheu alguns para serem salvos e outros para serem condenados','Que cada pessoa decide livremente por si mesma se será salva ou não','Que Deus quer que todos sejam salvos e que a condenação é consequência do pecado humano, não da vontade de Deus'],correct:2},
  {id:'Q16',q:'Como sabemos que o Espírito Santo está agindo em nós, segundo o ensino luterano?',a:['Quando sentimos uma emoção forte durante a oração ou o culto','Quando falamos em línguas ou recebemos uma revelação direta de Deus','Quando cremos no Evangelho e recebemos os sacramentos — o Espírito age pela Palavra e não depende de sentimentos'],correct:2},
  {id:'Q17',q:'Um amigo diz que quem tem o Espírito Santo fala em línguas e que você parece frio porque não chora nem sente nada forte no culto. O que o ensino luterano responde?',a:['Talvez ele tenha razão — quem tem o Espírito Santo sempre demonstra isso com emoção','Falar em línguas e sentir emoções fortes são sinais do Espírito, mas não os únicos','O Espírito Santo não é provado por emoções ou experiências — ele age pela Palavra e pelos sacramentos, criando e sustentando a fé, independente do que sentimos'],correct:2},
  {id:'Q18',q:'Os luteranos pecam ao ter imagens ou arte sacra em suas igrejas?',a:['Sim, qualquer imagem religiosa é proibida pelo Segundo Mandamento','Sim, imagens no culto sempre levam à idolatria','Não — o pecado é adorar ou venerar a imagem, não tê-la; arte sacra pode ser usada para ensinar e edificar'],correct:2},
  {id:'Q19',q:'Maria pode ser chamada de "Mãe de Deus"?',a:['Não, Maria é apenas mãe do ser humano Jesus, não de Deus','Não, esse título exalta Maria acima do que a Bíblia permite','Sim — porque Jesus é verdadeiro Deus e verdadeiro homem, Maria é mãe desse filho que é Deus encarnado, não significa que ela é superior a Deus'],correct:2},
  {id:'Q20',q:'O que é o Livro de Concórdia?',a:['Um livro escrito por Lutero com seus sermões e reflexões pessoais','O conjunto das decisões dos concílios da Igreja Luterana','A coletânea de todas as confissões de fé que definem o que os luteranos creem e ensinam'],correct:2},
  {id:'Q21',q:'Em que ano foi publicado o Livro de Concórdia?',a:['1517','1555','1580'],correct:2},
  {id:'Q22',q:'Qual documento do Livro de Concórdia foi apresentado ao imperador Carlos V em 1530 como explicação da fé luterana?',a:['Os Artigos de Esmalcalde','A Fórmula de Concórdia','A Confissão de Augsburgo'],correct:2},
  {id:'Q23',q:'Quem escreveu o Catecismo Menor?',a:['Felipe Melanchthon','João Calvino','Martinho Lutero'],correct:2},
  {id:'Q24',q:'O que é o Pentateuco?',a:['Os cinco livros proféticos do Antigo Testamento','Os cinco livros de sabedoria do Antigo Testamento','Os cinco primeiros livros da Bíblia, escritos por Moisés'],correct:2},
  {id:'Q25',q:'Quantos livros tem o Novo Testamento?',a:['39 livros','29 livros','27 livros'],correct:2},
  {id:'Q26',q:'O que são os Evangelhos?',a:['As cartas escritas pelos apóstolos para as igrejas','Os livros proféticos que anunciaram a vinda de Jesus','Os quatro livros que narram a vida, morte e ressurreição de Jesus Cristo'],correct:2},
  {id:'Q27',q:'Quais são os quatro Evangelhos?',a:['Mateus, Marcos, Lucas e Atos','Mateus, Marcos, João e Paulo','Mateus, Marcos, Lucas e João'],correct:2},
  {id:'Q28',q:'Quais são os três credos que a Igreja Luterana confessa?',a:['Credo Apostólico, Credo Niceno e Credo de Calvino','Credo Apostólico, Credo de Lutero e Credo de Atanásio','Credo Apostólico, Credo Niceno e Credo de Atanásio'],correct:2},
  {id:'Q29',q:'Por que os luteranos têm liturgia no culto?',a:['Porque é uma tradição cultural herdada da Europa sem significado teológico','Porque a liturgia organiza o culto de forma bonita e respeitosa','Porque a liturgia é estruturada ao redor da Palavra e dos sacramentos — ela nos coloca diante de Deus para recebermos o que ele quer nos dar'],correct:2},
  {id:'Q30',q:'O que é a Teologia da Cruz?',a:['A ideia de que Deus recompensa a fé com prosperidade e vitória visível nesta vida','A ideia de que quanto mais sofremos, mais próximos estamos de Deus','A compreensão de que o único lugar onde conhecemos Deus de verdade é na cruz de Cristo — é ali, na humilhação e morte do Filho de Deus, que ele se revela, e não em glória, poder ou experiências humanas'],correct:2}
];

const TICKERS=[
  '"Cristo para todos" — lema missionário da IELB.',
  'Sola Scriptura, Sola Gratia, Sola Fide — os pilares da Reforma.',
  'Seminário Concórdia — formando pastores fiéis à Palavra.',
  'A Confissão de Augsburgo guia a doutrina da IELB.',
  'A influência agora nasce de igrejas, membros, níveis e história.'
];

const G={year:1904,month:0,paused:true,started:false,gameOver:false,monthlyExpense:0,speed:1,fe:20,of:5,fi:12,doc:70,rateMult:1,rateFe:0.35,rateOf:0.08,rateFi:0.01,sel:'BR',lastEv:new Set(),tickIdx:0,lastRivalTurn:'',states:{},foundedDenoms:new Set(),seminaryOpen:false,seminaryMode:'strong',seminary:[],pastors:[],availablePastors:[],nextPastorId:1,annualDecisions:[],eventQueue:[],usedTheologyQuestions:[],offerBrokeMonths:0,mods:{doctrineGrowth:1,missionGrowth:1,youthRetention:1,persecutionPressure:1,pastoralFormation:1}};

function createDenomSlot(){return {churches:[],members:0,influence:0,cooldown:0,historicalPresence:0};}
function initGame(){
  ALL_STATES.forEach(id=>{
    const mul=STATE_MULTI[id]||{};
    G.states[id]={denomData:{},missionary:false,missionProg:0,modifiers:{receptivity:mul.receptivity||1,urban:mul.urban||1}};
    DENOM_KEYS.forEach(d=>G.states[id].denomData[d]=createDenomSlot());
  });
  DENOM_KEYS.forEach(d=>{
    const info=DENOMS[d];
    if(info.startYear<=1904) foundDenomination(d, true);
  });
  seedOpeningPastor();
  recalc();
}

function foundDenomination(d, initial=false){
  if(G.foundedDenoms.has(d)) return false;
  const info=DENOMS[d];
  if(info.startState==='ALL'){
    ALL_STATES.forEach(id=>G.states[id].denomData[d].historicalPresence=(STATE_POP[id]||100)*(info.historical||0.5));
  }else if(d==='IECLB'){
    const base={RS:10,SC:5,PR:3,SP:2};
    Object.entries(base).forEach(([stateId,count])=>{
      for(let i=0;i<count;i++)addChurch(stateId,d,14+Math.random()*8,1,info.startYear);
    });
  }else{
    addChurch(info.startState,d,d==='IELB'?12:10,1,info.startYear);
  }
  G.foundedDenoms.add(d);
  if(!initial) setTick(DENOMS[d].name+' nasce em '+STATES[info.startState].name+'.');
  return true;
}

function addChurch(stateId, denom, members=8, level=1, foundedYear=G.year){
  const slot=G.states[stateId].denomData[denom];
  if(!slot) return null;
  const usedCities=slot.churches.map(c=>c.city).filter(Boolean);
  const cityPool=(STATE_CITIES[stateId]||[STATES[stateId].name]);
  const city=arguments[6]||cityPool.find(c=>!usedCities.includes(c))||STATES[stateId].name;
  const type=arguments[5]||'congregacao';
  const church={denom,members,level,foundedYear,foundingChurch:slot.churches.length===0,pastorId:null,secondPastorId:null,struggleMonths:0,struggling:false,subsidized:false,solventMonths:0,overloadSince:null,offerRate:0.5+Math.random()*0.4,city,type,organicBias:(Math.random()-0.5)*0.025,organicPulse:(Math.random()-0.5)*0.03};
  slot.churches.push(church);
  syncDenomMembers(stateId,denom);
  return church;
}

function syncDenomMembers(stateId,denom){
  const slot=G.states[stateId].denomData[denom];
  slot.members=slot.churches.reduce((a,c)=>a+c.members,0);
}

function randInt(min,max){return Math.floor(min+Math.random()*(max-min+1));}
const PASTOR_FIRST=['Johann','Frederico','Carlos','Henrique','Guilherme','Ernesto','Paulo','Martinho','Theodoro','Augusto','Samuel','Daniel'];
const PASTOR_LAST=['Müller','Schmidt','Weber','Hoffmann','Schneider','Klein','Reuter','Bartz','Bräunig','Heine','Meyer','Krause'];
function pastorName(){return PASTOR_FIRST[randInt(0,PASTOR_FIRST.length-1)]+' '+PASTOR_LAST[randInt(0,PASTOR_LAST.length-1)];}
function makePastor(year){
  const p={id:G.nextPastorId++,name:pastorName(),graduationYear:year,age:25,yearsOfMinistry:0,retirementYear:year+30,assignedStateId:null,assignedChurchIndex:null,isOnRoute:false,routeChurchIndex:null,routeChurchIndexes:[],alive:true,retired:false};
  G.pastors.push(p);G.availablePastors.push(p.id);return p;
}
function planSeminaryOpening(mode){
  G.seminaryMode=mode;
  setTick('Decisão tomada: o Seminário terá turma regular a partir de 1908 e primeiras formaturas em 1915.');
}
function ensureSeminaryOpening(){
  if(G.seminaryOpen||G.year<1908)return false;
  G.seminaryOpen=true;
  const enrolled=G.seminaryMode==='strong'?randInt(4,6):randInt(2,3);
  G.seminary.push({entryYear:1908,enrolled});
  setTick('Seminário 1908: '+enrolled+' jovens ingressaram na primeira turma regular. Formação prevista para 1915.');
  return true;
}
function seedOpeningPastor(){
  const p=makePastor(1904);
  p.name='Jacob Broders';
  assignPastorToChurch(p,'RS',0);
  const p2=makePastor(1904);
  p2.name='João Kunstmann';
  const p3=makePastor(1904);
  p3.name='Frederico Brutschin';
  setTick('Pastor '+p.name+' atende a primeira congregação no Rio Grande do Sul. Mais 2 pastores estão disponíveis para novos campos.');
}
function getPastor(id){return G.pastors.find(p=>p.id===id);}
function removeAvailablePastor(id){G.availablePastors=G.availablePastors.filter(pid=>pid!==id);}
function releasePastor(p){
  if(!p)return;
  p.assignedStateId=null;p.assignedChurchIndex=null;p.isOnRoute=false;p.routeChurchIndex=null;p.routeChurchIndexes=[];
  if(p.alive&&!p.retired&&!G.availablePastors.includes(p.id))G.availablePastors.push(p.id);
}
function assignPastorToChurch(p,stateId,churchIndex){
  if(!p)return false;
  removeAvailablePastor(p.id);
  p.assignedStateId=stateId;p.assignedChurchIndex=churchIndex;p.isOnRoute=false;p.routeChurchIndex=null;p.routeChurchIndexes=[];
  const ch=G.states[stateId].denomData.IELB.churches[churchIndex];
  if(ch){if(ch.pastorId&&ch.pastorId!==p.id)ch.secondPastorId=p.id;else ch.pastorId=p.id;}
  return true;
}
function availablePastor(){const id=G.availablePastors[0];return id?getPastor(id):null;}
function activePastors(){return G.pastors.filter(p=>p.alive&&!p.retired&&(p.assignedStateId||G.availablePastors.includes(p.id)));}
function pastorForChurch(stateId,index){
  return G.pastors.find(p=>p.alive&&!p.retired&&p.assignedStateId===stateId&&(p.assignedChurchIndex===index||pastorRouteIndexes(p).includes(index)));
}
function pastorRouteIndexes(p){
  if(!p)return [];
  const list=Array.isArray(p.routeChurchIndexes)?p.routeChurchIndexes.slice():[];
  if(p.routeChurchIndex!==null&&p.routeChurchIndex!==undefined&&!list.includes(p.routeChurchIndex))list.push(p.routeChurchIndex);
  return list.filter(i=>i!==null&&i!==undefined);
}
function setPastorRoutes(p,indexes){
  if(!p)return;
  p.routeChurchIndexes=[...new Set((indexes||[]).filter(i=>i!==null&&i!==undefined))];
  p.routeChurchIndex=p.routeChurchIndexes.length?p.routeChurchIndexes[0]:null;
  p.isOnRoute=p.routeChurchIndexes.length>0;
}
function addPastorRoute(p,index){
  if(!p)return;
  const list=pastorRouteIndexes(p);
  if(!list.includes(index))list.push(index);
  setPastorRoutes(p,list);
}
function removePastorRoute(p,index){
  if(!p)return;
  setPastorRoutes(p,pastorRouteIndexes(p).filter(i=>i!==index));
}
function pastorAssignments(p,stateId=null){
  if(!p||!p.alive||p.retired)return [];
  const sid=stateId||p.assignedStateId;
  if(!sid||p.assignedStateId!==sid)return [];
  const slot=G.states[sid]?.denomData.IELB;
  if(!slot)return [];
  const indexes=[];
  if(p.assignedChurchIndex!==null&&p.assignedChurchIndex!==undefined)indexes.push(p.assignedChurchIndex);
  pastorRouteIndexes(p).forEach(i=>indexes.push(i));
  return [...new Set(indexes)].map(index=>({stateId:sid,index,ch:slot.churches[index]})).filter(r=>r.ch);
}
function pastorMemberLoad(p,stateId=null){
  return pastorAssignments(p,stateId).reduce((sum,r)=>sum+Math.max(0,r.ch.members||0),0);
}
function churchPastorLoad(stateId,index){
  const p=pastorForChurch(stateId,index);
  return p?pastorMemberLoad(p,stateId):0;
}
function isLargestPastorAssignment(stateId,index,p=null){
  const pastor=p||pastorForChurch(stateId,index);
  if(!pastor)return false;
  const assignments=pastorAssignments(pastor,stateId);
  if(!assignments.length)return false;
  const maxMembers=Math.max(...assignments.map(r=>Math.max(0,r.ch.members||0)));
  return assignments.some(r=>r.index===index&&Math.max(0,r.ch.members||0)>=maxMembers);
}
function churchNeedsPastorRelief(stateId,index){
  const ch=G.states[stateId].denomData.IELB.churches[index];
  if(!ch||ch.secondPastorId)return false;
  if(ch.type==='congregacao'&&ch.members>=300)return true;
  const p=pastorForChurch(stateId,index);
  return !!p&&pastorMemberLoad(p,stateId)>=300&&isLargestPastorAssignment(stateId,index,p);
}
function churchInfluenceMult(stateId,index){
  if(!churchNeedsPastorRelief(stateId,index))return 1;
  const over=Math.max(0,churchPastorLoad(stateId,index)-300);
  return Math.max(0.48,0.74-Math.min(0.26,over*0.0012));
}
function cityDistance(stateId,fromCity,toCity){
  const coords=CITY_COORDS[stateId]||{};
  const a=coords[fromCity], b=coords[toCity];
  if(a&&b){const dx=a[0]-b[0], dy=a[1]-b[1];return Math.sqrt(dx*dx+dy*dy);}
  const pool=STATE_CITIES[stateId]||[];
  const ai=pool.indexOf(fromCity), bi=pool.indexOf(toCity);
  if(ai>=0&&bi>=0)return Math.abs(ai-bi);
  return 999;
}
function routePastorForNewChurch(stateId,targetCity=null){
  const candidates=G.pastors.filter(p=>p.alive&&!p.retired&&p.assignedStateId===stateId&&p.assignedChurchIndex!==null);
  if(!targetCity||candidates.length<=1)return candidates[0]||null;
  return candidates.sort((a,b)=>{
    const ca=G.states[stateId].denomData.IELB.churches[a.assignedChurchIndex]?.city;
    const cb=G.states[stateId].denomData.IELB.churches[b.assignedChurchIndex]?.city;
    const loadDiff=pastorMemberLoad(a,stateId)-pastorMemberLoad(b,stateId);
    if(Math.abs(loadDiff)>1)return loadDiff;
    return cityDistance(stateId,ca,targetCity)-cityDistance(stateId,cb,targetCity);
  })[0]||null;
}
function pastoralStatus(stateId,index){
  const ch=G.states[stateId].denomData.IELB.churches[index];
  const p=pastorForChurch(stateId,index);
  if(!p)return {label:'Sem pastor',memberMult:0.35,offerMult:0.5};
  if(ch.secondPastorId)return {label:'Dois pastores',memberMult:1.1,offerMult:1.05};
  if(churchNeedsPastorRelief(stateId,index))return {label:'Pastor sobrecarregado',memberMult:0.68,offerMult:0.82};
  if(p.isOnRoute&&p.assignedChurchIndex===index)return {label:'Pastor próprio',memberMult:1,offerMult:1};
  if(pastorRouteIndexes(p).includes(index))return {label:'Pastor responsável',memberMult:1,offerMult:1};
  return {label:'Pastor próprio',memberMult:1,offerMult:1};
}

function ensureScheduledFoundations(){
  DENOM_KEYS.forEach(d=>{ if(DENOMS[d].startYear<=G.year) foundDenomination(d); });
}

// influência unificada: todas as denominações usam igrejas, membros, nível, identidade, receptividade, história e eventos.
function recalcInfluence(){
  ALL_STATES.forEach(id=>{
    const st=G.states[id];
    DENOM_KEYS.forEach(d=>{
      const info=DENOMS[d], slot=st.denomData[d];
      syncDenomMembers(id,d);
      const churches=slot.churches.length;
      const memberPower=slot.churches.reduce((sum,c,i)=>{
        const scale=i===0?1:1/(1+i*0.18);
        const pastoralPower=d==='IELB'?churchInfluenceMult(id,i):1;
        return sum+Math.pow(Math.max(0,c.members),0.86)*(1+c.level*0.18)*scale*pastoralPower;
      },0);
      const overloaded=d==='IELB'?slot.churches.filter((_,i)=>churchNeedsPastorRelief(id,i)).length:0;
      const networkMult=overloaded?Math.max(0.62,1-overloaded*0.08):1;
      const networkPower=churches ? (churches*18+Math.sqrt(slot.members)*2.6)*networkMult : 0;
      const doctrineFactor=d==='IELB'
        ? Math.max(0.82,Math.min(1.1,0.9+(G.doc/100)*0.14+(G.mods.doctrineGrowth-1)*0.08))
        : 1;
      const historical=slot.historicalPresence ? Math.pow(slot.historicalPresence,0.82)*0.55 : 0;
      const raw=(memberPower+networkPower)*info.identity*(st.modifiers.receptivity||1)*doctrineFactor+historical;
      const popDamp=Math.pow((STATE_POP[id]||100)/350,0.32);
      slot.influence=Math.max(0, raw/Math.max(0.75,popDamp));
    });
  });
}

function pastoralFinanceMult(){return Math.max(0.85,Math.min(1.75,G.mods.pastoralFormation));}

function churchOrganicMemberRate(stateId,index){
  const ch=G.states[stateId].denomData.IELB.churches[index];
  if(!ch)return 0;
  if(ch.organicBias===undefined)ch.organicBias=(Math.random()-0.5)*0.035;
  if(ch.organicPulse===undefined)ch.organicPulse=(Math.random()-0.5)*0.04;
  const pastoral=pastoralStatus(stateId,index);
  const state=G.states[stateId];
  const isMission=ch.type==='missao';
  const doctrineScore=Math.max(0.35,Math.min(2.1,(G.doc/80)*G.mods.doctrineGrowth));
  const missionScore=Math.max(0.45,Math.min(2.0,G.mods.missionGrowth));
  const youthScore=Math.max(0.55,Math.min(1.8,G.mods.youthRetention));
  const receptivityScore=Math.max(0.65,Math.min(1.45,(state.modifiers&&state.modifiers.receptivity)||1));
  const pastorScore=Math.max(0.45,Math.min(1.35,pastoral.memberMult+0.15));
  const health=doctrineScore*missionScore*youthScore*receptivityScore*pastorScore;
  const base=isMission?0.12:0.18;
  const memberMomentum=Math.min(isMission?0.65:1.15,Math.max(0,ch.members)*(isMission?0.0032:0.0042));
  const overloadMembers=Math.max(ch.members,churchPastorLoad(stateId,index));
  const overloadPenalty=churchNeedsPastorRelief(stateId,index)?(0.55+Math.min(1.1,(overloadMembers-300)*0.006)):0;
  const noPastorPenalty=!pastorForChurch(stateId,index)?0.65:0;
    const randomField=(ch.organicBias||0)+(ch.organicPulse||0);
  const rate=((base+memberMomentum)*health)+randomField-overloadPenalty-noPastorPenalty;
  if(churchNeedsPastorRelief(stateId,index))return Math.max(-0.5,Math.min(-0.05,rate));
  return Math.max(-1.2,Math.min(2.2,rate));
}
function churchMemberTrendReason(stateId,index){
  const ch=G.states[stateId].denomData.IELB.churches[index];
  if(!pastorForChurch(stateId,index))return 'sem pastor';
  const ps=pastoralStatus(stateId,index);
  if(churchNeedsPastorRelief(stateId,index))return 'sobrecarga pastoral';
  if(G.doc<70)return 'doutrina fraca';
  return 'crescimento orgânico';
}
function totalOrganicMemberRate(){
  return ALL_STATES.reduce((sum,id)=>sum+G.states[id].denomData.IELB.churches.reduce((a,_,i)=>a+churchOrganicMemberRate(id,i),0),0);
}
function applyOrganicMemberGrowth(dt){
  ALL_STATES.forEach(id=>{
    let changed=false;
    G.states[id].denomData.IELB.churches.forEach((ch,i)=>{
      const gain=churchOrganicMemberRate(id,i)*dt;
      if(gain!==0){ch.members=Math.max(1,ch.members+gain);changed=true;}
    });
    if(changed)syncDenomMembers(id,'IELB');
  });
}
function recalc(){
  recalcInfluence();
  let fe=0.3,of=0,fi=0;
  let expense=0;
  ALL_STATES.forEach(id=>{
    const mul=STATE_MULTI[id]||{fe:1,of:1};
    G.states[id].denomData.IELB.churches.forEach((c,i)=>{
      const pastoral=pastoralStatus(id,i);
      const scale=i===0?1:1/(1+i*EXTRA_CHURCH_DIMINISH);
      const memberRoot=Math.sqrt(Math.max(0,c.members));
      const levelGain=1+(c.level-1)*0.22;
      fe+=memberRoot*FAITH_ROOT_GAIN*levelGain*mul.fe*scale*pastoral.memberMult*G.mods.doctrineGrowth/Math.max(0.85,G.mods.persecutionPressure);
      fi+=churchOrganicMemberRate(id,i);
      const bal=churchInternalBalance(id,i);
      of+=Math.max(0,bal.net);
      if(c.subsidized)expense+=bal.deficit;
    });
  });
  if(G.seminaryOpen){
    expense+=SEMINARY_MONTHLY_COST;
    const activeSub=G.seminary.filter(c=>G.year-c.entryYear<SEMINARY_YEARS).reduce((a,c)=>a+(c.subsidyCount||0),0);
    expense+=activeSub*SEMINARY_SUBSIDY_PER_STUDENT;
  }
  G.monthlyExpense=expense;
  G.rateFe=fe*G.rateMult*ECONOMY_SCALE;G.rateOf=(of*pastoralFinanceMult())-expense;G.rateFi=fi*G.rateMult;
}

function monthlyRivalOrganicGrowth(){
  DENOM_KEYS.forEach(d=>{
    if(d==='IELB'||!G.foundedDenoms.has(d))return;
    const info=DENOMS[d];
    ALL_STATES.forEach(id=>{
      const slot=G.states[id].denomData[d];
      if(!slot.churches.length)return;
      const state=G.states[id];
      const profileBoost=(info.profile==='aggressive'||info.profile==='pentecostal')?1.35:info.profile==='fast'?1.18:info.profile==='historic'?0.45:1;
      const popBoost=Math.min(2.4,Math.sqrt((STATE_POP[id]||100)/450));
      const urbanBoost=(info.profile==='aggressive'||info.profile==='pentecostal')?(state.modifiers.urban||1):1;
      const base=RIVAL_ORGANIC_SCALE*info.growth*profileBoost*popBoost*urbanBoost*(state.modifiers.receptivity||1);
      slot.churches.forEach(ch=>{ch.members+=Math.max(0.02,ch.level*base);});
      info.resource+=0.08*slot.churches.length+Math.sqrt(Math.max(0,slot.members))*0.018;
    });
    info.resource-=rivalMaintenance(d);
    if(info.resource<-4)trimWeakRivalChurch(d);
    if(info.resource<-12)trimWeakRivalChurch(d);
  });
}

function rivalAdminCapacity(d){
  const info=DENOMS[d];
  if(!info.adminCapacity){
    info.adminCapacity=info.profile==='historic'?12:(info.profile==='aggressive'||info.profile==='pentecostal')?7:5;
  }
  return info.adminCapacity;
}

function rivalMaintenance(d){
  const churches=totalChurches(d);
  const states=statePresenceCount(d);
  const overload=Math.max(0,churches-rivalAdminCapacity(d));
  const profile=DENOMS[d].profile;
  const structure=profile==='historic'?0.12:0.2;
  return churches*0.12+Math.max(0,states-1)*structure+overload*0.26+totalMembers(d)*0.0009;
}

function trimWeakRivalChurch(d){
  let weakest=null;
  ALL_STATES.forEach(id=>{
    G.states[id].denomData[d].churches.forEach((ch,i)=>{
      if(!weakest||ch.members<weakest.ch.members)weakest={id,i,ch};
    });
  });
  if(!weakest)return;
  weakest.ch.members=Math.max(0,weakest.ch.members-1.5);
  if(weakest.ch.members<3&&totalChurches(d)>1){
    G.states[weakest.id].denomData[d].churches.splice(weakest.i,1);
    syncDenomMembers(weakest.id,d);
    DENOMS[d].resource=0;
  }
}

function applyMonthlySustainability(){
  if(G.of>0){G.offerBrokeMonths=0;return;}
  const deficit=Math.abs(Math.min(0,G.rateOf));
  G.fe=Math.max(0,G.fe-deficit*0.35);
  G.doc=Math.max(0,G.doc-deficit*0.08);
  G.offerBrokeMonths=(G.offerBrokeMonths||0)+1;
  if(G.offerBrokeMonths===12)setTick('Atenção: a IELB está sem recursos há 1 ano. Se continuar assim por mais 1 ano, a obra será encerrada.');
  if(G.offerBrokeMonths>=24)endCampaign(false,'A IELB ficou 2 anos sem recursos financeiros e não conseguiu manter a obra. A campanha foi encerrada.');
}

function totalChurchOfferIncome(){
  return ALL_STATES.reduce((sum,id)=>sum+G.states[id].denomData.IELB.churches.reduce((s,c,i)=>s+Math.max(0,churchInternalBalance(id,i).net),0),0);
}
function totalChurchOfferAfterFormation(){return totalChurchOfferIncome()*pastoralFinanceMult();}

function churchInternalBalance(stateId,index){
  const ch=G.states[stateId].denomData.IELB.churches[index];
  const pastoral=pastoralStatus(stateId,index);
  const mul=STATE_MULTI[stateId]||{of:1};
  const scale=index===0?1:1/(1+index*0.08);
  const memberIncome=Math.max(0,ch.members)*OFFER_ROOT_GAIN;
  const grossIncome=memberIncome*mul.of*scale*pastoral.offerMult*G.rateMult*ECONOMY_SCALE;
  const income=grossIncome*(ch.offerRate||0.7);
  const cost=PLAYER_CHURCH_UPKEEP+(ch.type==='missao'?0.08:0.18)+ch.members*PLAYER_MEMBER_CARE_UPKEEP;
  const net=income-cost;
  return {income,cost,net,deficit:Math.max(0,-net),pastoral};
}

function processPlayerMonthlyChurches(){
  ALL_STATES.forEach(id=>{
    G.states[id].denomData.IELB.churches.forEach((ch,i)=>{
      const bal=churchInternalBalance(id,i);
      ch._lastDeficit=bal.deficit;
      if(ch.subsidized){
        ch.subsidyMonths=(ch.subsidyMonths||0)+1;
        if(ch.subsidyMonths>=CHURCH_SUBSIDY_MONTHS){ch.subsidized=false;ch.subsidyMonths=0;setTick('Subsídio de '+(ch.city||STATES[id].name)+' encerrado após revisão de 5 anos.');}
      }
      if(bal.deficit>0.01){ch.struggleMonths=(ch.struggleMonths||0)+1;if(ch.struggleMonths===3)setTick('Congregação em '+STATES[id].name+' com dificuldades financeiras.');}
      else {ch.struggleMonths=0;ch.failedStewardshipAttempts=0;if(ch.subsidized){ch.solventMonths=(ch.solventMonths||0)+1;if(ch.solventMonths>=2){ch.subsidized=false;ch.subsidyMonths=0;setTick('Congregação em '+STATES[id].name+' voltou ao auto-sustento.');}} ch.struggling=false;}
      ch.organicPulse=(Math.random()-0.5)*0.04;
      const nowMembers=ch.members;
      if(ch._stagnationWindowStart===undefined){ch._stagnationWindowStart=nowMembers;ch._stagnationMonths=0;}
      ch._stagnationMonths=(ch._stagnationMonths||0)+1;
      const gainedInWindow=nowMembers-(ch._stagnationWindowStart||nowMembers);
      if(gainedInWindow>=10){ch._stagnationWindowStart=nowMembers;ch._stagnationMonths=0;ch.stagnantMonths=0;}
      else ch.stagnantMonths=ch._stagnationMonths||0;
      const rateTarget=(bal.pastoral.memberMult*0.6)*(0.5+G.doc/200);
      ch.offerRate=Math.max(0.15,Math.min(1,ch.offerRate+(rateTarget-ch.offerRate)*0.008+(Math.random()-0.5)*0.005));
      if(ch.type==='congregacao'&&ch.members>=300&&!ch.secondPastorId&&ch.overloadSince===null){ch.overloadSince=G.year;setTick('A congregação em '+STATES[id].name+' tem '+Math.floor(ch.members)+' membros para 1 pastor.');if(G.started&&!G.paused)showSecondPastorModal(id,i,true);}
      if(ch.overloadSince!==null&&G.year-ch.overloadSince>=2&&ch.members>=250&&!ch.secondPastorId)ch.members-=ch.members*0.015;
      ch.members=Math.max(1,ch.members);
    });
    syncDenomMembers(id,'IELB');
  });
}

function processAnnualYear(){
  const lines=[];
  let exits=0, entries=0;
  const openedThisYear=ensureSeminaryOpening();
  scheduleTheologyQuestion();
  G.pastors.slice().forEach(p=>{
    if(!p.alive||p.retired)return;
    p.age++;p.yearsOfMinistry++;
    const stateName=p.assignedStateId?STATES[p.assignedStateId].name:'sem campo';
    const deathChance=p.yearsOfMinistry>=25?0.025:p.yearsOfMinistry>=15?0.012:0.005;
    if(p.yearsOfMinistry>=30){
      clearPastorFromChurches(p);p.retired=true;exits++;
      lines.push('Pastor '+p.name+' se tornou pastor emérito após 30 anos de ministério em '+stateName+'.');
      G.eventQueue.push({type:'pastorExit',kind:'retirement',year:G.year,name:p.name,stateName,years:p.yearsOfMinistry});
    }else if(Math.random()<deathChance){
      clearPastorFromChurches(p);p.alive=false;exits++;
      lines.push('LUTO: Pastor '+p.name+' faleceu após '+p.yearsOfMinistry+' anos de ministério.');
      G.eventQueue.push({type:'pastorExit',kind:'death',year:G.year,name:p.name,stateName,years:p.yearsOfMinistry});
    }
  });
  if(G.seminaryOpen){
    const graduating=G.seminary.filter(c=>c.entryYear===G.year-SEMINARY_YEARS);
    graduating.forEach(c=>{
      const r=G.year<1930?randRange(0.3,0.55):G.year<1950?randRange(0.4,0.6):randRange(0.45,0.65);
      const formed=Math.max(1,Math.min(c.enrolled-1,Math.round(c.enrolled*r)));
      entries+=formed;
      const formedPastors=[];
      for(let i=0;i<formed;i++)formedPastors.push(makePastor(G.year));
      G.eventQueue.push({type:'formation',entryYear:c.entryYear,gradYear:G.year,enrolled:c.enrolled,formed,left:Math.max(0,c.enrolled-formed),names:formedPastors.map(p=>p.name)});
    });
    if(!openedThisYear){
      const enrolled=seminaryEnrollmentForYear(G.year);
      const cohort={entryYear:G.year,enrolled,subsidyCount:0};
      G.seminary.push(cohort);
      lines.unshift('Seminário '+G.year+': '+enrolled+' jovens ingressaram no seminário este ano.');
      if(Math.random()<0.35){
        const reqCount=randInt(1,Math.max(1,Math.floor(enrolled*0.3)));
        G.eventQueue.push({type:'subsidy',year:G.year,count:reqCount,cohort});
      }
    }else{
      const first=G.seminary.find(c=>c.entryYear===1908);
      if(first&&!first.subsidyCount)first.subsidyCount=0;
      lines.unshift('Seminário 1908: '+(first?first.enrolled:0)+' jovens ingressaram na primeira turma regular.');
    }
  }else{
    lines.unshift(G.year<1905?'Seminário '+G.year+': ainda sem turma regular. A decisão sobre reabertura virá em 1905.':'Seminário '+G.year+': transferência e reabertura em preparação; primeira turma regular prevista para 1908.');
  }
  lines.push('Saldo pastoral do ano: '+exits+' saíram, '+entries+' formados. Saldo: '+(entries-exits>=0?'+':'')+(entries-exits)+'.');
  if(entries<exits)lines.push('Atenção: mais pastores saíram do que entraram. Algumas congregações podem ficar descobertas.');
  const uncovered=uncoveredChurches().length;
  if(uncovered)lines.push(uncovered+' congregações estão sem pastor. Você tem '+G.availablePastors.length+' pastores disponíveis.');
  G.annualDecisions=churchesNeedingAnnualDecision();
  setTick(lines.join(' | '));
  if(G.eventQueue.length)processEventQueue();
  else if(G.annualDecisions.length)showChurchDecision(G.annualDecisions.shift());
}


function randRange(min,max){return min+Math.random()*(max-min);}
function seminaryEnrollmentForYear(y){return y<1930?randInt(2,6):y<1950?randInt(5,12):y<1970?randInt(10,25):randInt(20,40);}
function scheduleTheologyQuestion(){
  if(G.year<1908||(G.year-1908)%4!==0)return;
  if(!Array.isArray(G.usedTheologyQuestions))G.usedTheologyQuestions=[];
  const available=THEOLOGY_QUESTIONS.filter(q=>!G.usedTheologyQuestions.includes(q.id));
  if(!available.length)return;
  const question=available[randInt(0,available.length-1)];
  G.usedTheologyQuestions.push(question.id);
  G.eventQueue.push({type:'theologyQuestion',question});
}
function clearPastorFromChurches(p){
  if(p.assignedStateId){
    const churches=G.states[p.assignedStateId].denomData.IELB.churches;
    churches.forEach(ch=>{if(ch.pastorId===p.id)ch.pastorId=null;if(ch.secondPastorId===p.id)ch.secondPastorId=null;});
  }
  removeAvailablePastor(p.id);
  p.assignedStateId=null;p.assignedChurchIndex=null;p.isOnRoute=false;p.routeChurchIndex=null;p.routeChurchIndexes=[];
}
function uncoveredChurches(){
  const list=[];ALL_STATES.forEach(id=>G.states[id].denomData.IELB.churches.forEach((ch,i)=>{if(!pastorForChurch(id,i))list.push({stateId:id,index:i,ch});}));
  return list;
}
function churchesNeedingAnnualDecision(){
  const total=totalChurches('IELB');
  const list=[];
  ALL_STATES.forEach(id=>G.states[id].denomData.IELB.churches.forEach((ch,i)=>{
    if(churchNeedsPastorRelief(id,i)&&ch.lastSecondPastorDecisionYear!==G.year)list.push({stateId:id,index:i,ch,reason:'secondPastor'});
    else if((ch.struggleMonths||0)>=6&&!ch.subsidized&&total>1)list.push({stateId:id,index:i,ch,reason:'deficit'});
    else if((ch.stagnantMonths||0)>=36&&((ch.members-(ch._stagnationWindowStart||ch.members))<10)&&total>1&&ch.lastStagnationDecisionYear!==G.year)list.push({stateId:id,index:i,ch,reason:'stagnant'});
  }));
  return list;
}

function stateInfluenceSorted(id){
  return DENOM_KEYS.map(d=>[d,G.states[id].denomData[d].influence]).filter(([,v])=>v>0.01).sort((a,b)=>b[1]-a[1]);
}
function churchCount(id,d){return G.states[id].denomData[d].churches.length;}
function totalMembers(d){return ALL_STATES.reduce((sum,id)=>sum+G.states[id].denomData[d].members,0);}
function totalChurches(d){return ALL_STATES.reduce((sum,id)=>sum+churchCount(id,d),0);}
function statePresenceCount(d){return ALL_STATES.filter(id=>churchCount(id,d)>0).length;}
function nationalDisplayInfluenceRows(){
  const nonCath=DENOM_KEYS.filter(d=>d!=='CAT').map(d=>[d,ALL_STATES.reduce((a,id)=>a+G.states[id].denomData[d].influence,0)]).filter(([,v])=>v>0);
  const nonCathRaw=nonCath.reduce((a,[,v])=>a+v,0);
  const cathRaw=ALL_STATES.reduce((a,id)=>a+G.states[id].denomData.CAT.influence,0);
  const nonCathPct=Math.min(78,Math.max(0,100*nonCathRaw/Math.max(1,cathRaw*5+nonCathRaw)));
  const cathPct=Math.max(0,100-nonCathPct);
  const rows=[['CAT',cathPct]];
  const nonCathSum=nonCathRaw||1;
  nonCath.forEach(([d,v])=>rows.push([d,nonCathPct*(v/nonCathSum)]));
  return rows.filter(([,v])=>v>=0.5).sort((a,b)=>b[1]-a[1]);
}

const svgEl=document.getElementById('mapsvg');
const centerEl=document.getElementById('center');

function bindMap(){
  svgEl.addEventListener('click',e=>{ if(e.target===svgEl || e.target.tagName==='rect') selectBrazilOverview(); });
  document.querySelectorAll('.bstate').forEach(path=>{
    const id=path.dataset.state;
    path.addEventListener('click',e=>{e.stopPropagation();selectState(id);});
    path.addEventListener('mousemove',e=>showTip(id,e));
    path.addEventListener('mouseleave',()=>document.getElementById('tooltip').style.display='none');
  });
}

function showTip(id,e){
  const rect=centerEl.getBoundingClientRect();
  const sorted=stateInfluenceSorted(id), tot=sorted.reduce((a,[,v])=>a+v,0)||1;
  const pct=(((G.states[id].denomData.IELB.influence||0)/tot)*100).toFixed(0);
  const tip=document.getElementById('tooltip');
  tip.style.display='block';tip.style.left=(e.clientX-rect.left+12)+'px';tip.style.top=(e.clientY-rect.top-28)+'px';
  tip.textContent=STATES[id].name+' | Pop: '+(STATE_POP[id]||'?')+'k | IELB: '+pct+'%';
}

function selectState(id){
  if(!G.states[id]) return;
  G.sel=id;
  document.querySelectorAll('.bstate').forEach(p=>p.classList.toggle('selected',p.dataset.state===id));
  renderLeft();renderRight();
}

function selectBrazilOverview(){
  G.sel='BR';
  document.querySelectorAll('.bstate').forEach(p=>p.classList.remove('selected'));
  document.getElementById('state-name').textContent='Brasil';
  renderBrazilLeft();renderBrazilRight();
}

// marcadores compactos: no máximo três denominações por estado, com cor e número de igrejas.
function redrawDots(){
  const dl=document.getElementById('dots-g');dl.innerHTML='';
  ALL_STATES.forEach(id=>{
    const s=MARKER_POS[id]||STATES[id];
    const top=DENOM_KEYS.map(d=>[d,churchCount(id,d)]).filter(([d,n])=>n>0 && DENOMS[d].startYear<=G.year).sort((a,b)=>b[1]-a[1]);
    top.forEach(([d,n],i)=>{
      const p=markerPoint(id,i,top.length);
      mkMarker(p.x,p.y,d,n,id,top.length);
    });
    const st=G.states[id];
    if(st.missionary){
      const c=document.createElementNS(NS,'circle');
      c.setAttribute('cx',s.x);c.setAttribute('cy',s.y-5200);c.setAttribute('r',2600);
      c.setAttribute('fill','none');c.setAttribute('stroke',DENOMS.IELB.color);c.setAttribute('stroke-width','650');c.setAttribute('opacity','0.55');
      c.setAttribute('class','mdot');c.addEventListener('click',e=>{e.stopPropagation();selectState(id);});dl.appendChild(c);
    }
  });
}

function markerPoint(id,i,total){
  const base=MARKER_POS[id]||STATES[id];
  const slots=MARKER_SLOTS[id]||MARKER_SLOTS_DEFAULT;
  if(total===1)return {x:base.x,y:base.y};
  if(i<slots.length){
    const slot=slots[i];
    return {x:base.x+slot[0],y:base.y+slot[1]};
  }
  const ring=Math.floor((i-slots.length)/8)+1;
  const angle=((i-slots.length)%8)*(Math.PI*2/8)+(id.charCodeAt(0)%5)*0.18;
  const dist=4200+ring*2600;
  return {x:base.x+Math.cos(angle)*dist,y:base.y+Math.sin(angle)*dist};
}

function markerRadius(sid,total){
  const small=['DF','RJ','ES','SE','AL','PB','RN','PE','SC','CE'];
  if(total>=7)return small.includes(sid)?1050:1300;
  if(total>=5)return small.includes(sid)?1200:1500;
  if(total>=4)return small.includes(sid)?1400:1700;
  return small.includes(sid)?1900:2200;
}

function mkMarker(x,y,d,n,sid,total){
  const g=document.createElementNS(NS,'g');g.setAttribute('class','state-marker'+(d==='IELB'?' ielb':''));
  g.setAttribute('transform','translate('+x+' '+y+')');g.addEventListener('click',e=>{e.stopPropagation();selectState(sid);});
  const r=markerRadius(sid,total);
  const circle=document.createElementNS(NS,'circle');circle.setAttribute('r',r);circle.setAttribute('fill',DENOMS[d].color);circle.setAttribute('stroke',d==='IELB'?'#f5f0e8':'rgba(0,0,0,0.35)');circle.setAttribute('stroke-width',d==='IELB'?Math.max(520,r*0.28):Math.max(300,r*0.16));g.appendChild(circle);
  const text=document.createElementNS(NS,'text');text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','central');text.setAttribute('font-size',Math.max(1450,r*0.92));text.setAttribute('font-weight','800');text.setAttribute('fill','#fff');text.textContent=n>99?'99+':String(n);g.appendChild(text);
  document.getElementById('dots-g').appendChild(g);
}

function buildLegend(){
  document.getElementById('leg-body').innerHTML=Object.entries(DENOMS).filter(([d])=>G.foundedDenoms.has(d)||DENOMS[d].startYear<=G.year).map(([d,di])=>'<div class="leg-r"><span class="leg-d" style="background:'+di.color+'"></span><span class="leg-n">'+di.name+'</span></div>').join('');
}

function renderBrazilLeft(){
  document.getElementById('state-name').textContent='Visão geral do Brasil';
  const body=document.getElementById('left-body');body.innerHTML='';
  addT(body,'Brasil');
  addR(body,'Igrejas IELB',totalChurches('IELB'));
  addR(body,'Membros IELB',Math.floor(totalMembers('IELB')));
  addT(body,'Seminário');
  if(G.seminaryOpen&&G.seminary.length)G.seminary.slice(-5).forEach(c=>addR(body,'Turma '+c.entryYear,c.enrolled+' alunos | forma em '+(c.entryYear+SEMINARY_YEARS)));
  else {const sp=document.createElement('p');sp.className='hint';sp.textContent=G.year<1908?'Primeira turma regular prevista para 1908; primeiros pastores em 1915.':'Aguardando abertura regular.';body.appendChild(sp);}
  addT(body,'Influência Nacional');
  nationalDisplayInfluenceRows().slice(0,8).forEach(([d,v])=>addColorRow(body,d,Math.round(v)+'%'));
  addT(body,'Maior presença IELB');
  ALL_STATES.map(id=>[id,churchCount(id,'IELB'),G.states[id].denomData.IELB.members]).filter(([,c])=>c>0).sort((a,b)=>b[1]-a[1]||b[2]-a[2]).slice(0,5).forEach(([id,c,m])=>addR(body,STATES[id].name,c+' igrejas / '+Math.floor(m)+' membros'));
  addT(body,'Sem presença IELB');
  const missing=ALL_STATES.filter(id=>churchCount(id,'IELB')===0).map(id=>id).join(', ');
  const p=document.createElement('p');p.className='hint';p.style.textAlign='left';p.textContent=missing||'Todos os estados têm presença IELB.';body.appendChild(p);
}

function renderBrazilRight(){
  document.getElementById('right-sub').textContent='Brasil';
  const body=document.getElementById('right-body');body.innerHTML='';
  addT(body,'Ações Globais');
  addBtn(body,'✝ Realizar Culto','+4 Fé imediatamente','act quick-hit',()=>culto(),G.paused);
  addBtn(body,'Catecismo','Custo: 25 Fé → +5 membros disponíveis','act quick-hit',()=>catecismo(),G.paused||G.fe<25,'btn-cat-r');
  addT(body,'Direção Nacional');
  addR(body,'Doutrina',Math.floor(G.doc)+'%');
  addR(body,'Pastores ativos',activePastors().length);
  addR(body,'Pastores disponíveis',G.availablePastors.length);
  addR(body,'Congregações sem pastor',uncoveredChurches().length);
  addR(body,'Ofertas das igrejas','+'+totalChurchOfferIncome().toFixed(2)+'/mês');
  if(G.seminaryOpen){addR(body,'Seminário','-'+SEMINARY_MONTHLY_COST.toFixed(2)+'/mês');}
  const activeSub=G.seminary.filter(c=>G.year-c.entryYear<SEMINARY_YEARS).reduce((a,c)=>a+(c.subsidyCount||0),0);
  if(activeSub>0)addR(body,'Subsídio seminaristas','-'+(activeSub*SEMINARY_SUBSIDY_PER_STUDENT).toFixed(2)+'/mês');
  const churchSubTotal=ALL_STATES.reduce((sum,sid)=>sum+G.states[sid].denomData.IELB.churches.reduce((s,c,i)=>s+(c.subsidized?churchInternalBalance(sid,i).deficit:0),0),0);
  addR(body,'Subsídio igrejas',churchSubTotal>0.01?'-'+churchSubTotal.toFixed(2)+'/mês':'0');
  addR(body,'Formação pastoral',pastoralFinanceMult().toFixed(2)+'x');
  addR(body,'Missão',G.mods.missionGrowth.toFixed(2)+'x');
  addR(body,'Retenção jovem',G.mods.youthRetention.toFixed(2)+'x');
  addT(body,'Pastores disponíveis');
  if(G.availablePastors.length)G.availablePastors.slice(0,6).forEach(id=>{const p=getPastor(id);if(p)addR(body,p.name,'formado em '+p.graduationYear);});
  else {const p=document.createElement('p');p.className='hint';p.textContent='Nenhum pastor livre. Use rotas ou aguarde formaturas.';body.appendChild(p);}
}

function renderLeft(){
  const id=G.sel;if(id==='BR')return renderBrazilLeft();
  const st=G.states[id];document.getElementById('state-name').textContent=STATES[id].name;
  const body=document.getElementById('left-body');body.innerHTML='';
  const mul=STATE_MULTI[id]||{fe:1,of:1};
  const ielbC=st.denomData.IELB.churches;
  addT(body,'Perfil da Região');
  addR(body,'População',(STATE_POP[id]||'?')+'k hab.');
  addR(body,'Receptividade',st.modifiers.receptivity>=1.2?'Alta':st.modifiers.receptivity>=0.95?'Normal':'Baixa');
  addR(body,'Ofertas por membro',mul.of>=1.5?'Alta':mul.of>=0.9?'Normal':'Baixa');
  if(st.missionary){addT(body,'Missionário em Campo');const p=getPastor(st.missionPastorId);const mp=document.createElement('div');mp.innerHTML='<div style="font-size:12px;color:#7a6a40;margin-bottom:3px">'+(p?p.name+' | ':'')+Math.floor(st.missionProg)+'% concluído</div><div class="miss-bar"><div class="miss-fill" style="width:'+st.missionProg+'%"></div></div>';body.appendChild(mp);}
  if(ielbC.length){addT(body,'Congregações IELB');ielbC.forEach((c,i)=>{const ps=pastoralStatus(id,i);addR(body,'Igreja '+(i+1)+' | Nível '+c.level,Math.floor(c.members)+' membros | '+ps.label);addR(body,'Taxa de oferta',Math.round((c.offerRate||0.7)*100)+'%');if(c.struggleMonths>=3)addR(body,'Dificuldade financeira','há '+c.struggleMonths+' meses');});}
  addT(body,'Influência Religiosa');
  const sorted=stateInfluenceSorted(id), tot=sorted.reduce((a,[,v])=>a+v,0)||1;
  const track=document.createElement('div');track.className='inf-track';
  sorted.forEach(([d,v])=>{if(v/tot<0.005)return;const seg=document.createElement('div');seg.className='inf-seg';seg.style.width=(v/tot*100)+'%';seg.style.background=DENOMS[d].color;track.appendChild(seg);});
  body.appendChild(track);
  const il=document.createElement('div');il.className='inf-leg';
  sorted.slice(0,6).forEach(([d,v])=>{const r=document.createElement('div');r.className='inf-row';r.innerHTML='<span class="inf-dot" style="background:'+DENOMS[d].color+'"></span>'+DENOMS[d].name+': '+(v/tot*100).toFixed(0)+'%';il.appendChild(r);});
  body.appendChild(il);
  const rivals=DENOM_KEYS.filter(d=>d!=='IELB'&&churchCount(id,d)>0).sort((a,b)=>churchCount(id,b)-churchCount(id,a));
  if(rivals.length){addT(body,'Igrejas Rivais');rivals.forEach(d=>addColorRow(body,d,churchCount(id,d)+' igrejas / '+Math.floor(st.denomData[d].members)+' membros'));}
}

function renderRight(){
  const id=G.sel;if(id==='BR')return renderBrazilRight();
  document.getElementById('right-sub').textContent=id?STATES[id].name:'Brasil';
  const body=document.getElementById('right-body');body.innerHTML='';
  const st=G.states[id], ielbC=st.denomData.IELB.churches;
  const ielbSlot=st.denomData.IELB;
  addT(body,'Ações Globais');
  addBtn(body,'✝ Realizar Culto','+4 Fé imediatamente','act',()=>culto(),G.paused);
  addBtn(body,'Catecismo','Custo: 25 Fé → +5 membros disponíveis','act',()=>catecismo(),G.paused||G.fe<25,'btn-cat-r');
  addT(body,'Ações neste Estado');
  if(!st.missionary&&!ielbC.length) addBtn(body,'Enviar missionário','Custo: 45 Ofertas + 8 Membros'+(ielbSlot.cooldown>0?' | '+ielbSlot.cooldown+' meses':''),'miss',()=>sendMission(id),G.of<45||G.fi<8||ielbSlot.cooldown>0);
  if(ielbC.length){
    const cn=churchPlantCost(id);
    addBtn(body,'Abrir missão ('+(ielbC.length+1)+'ª)','Custo: '+cn+' Ofertas + 8 Membros'+(ielbSlot.cooldown>0?' | '+ielbSlot.cooldown+' meses':''),'miss',()=>newChurch(id),G.of<cn||G.fi<8||ielbSlot.cooldown>0);
    ielbC.forEach((c,i)=>{if(c.level<5)addBtn(body,'Expandir Igreja '+(i+1)+' → Nível '+(c.level+1),'Custo: '+(c.level*55)+' Ofertas','',()=>levelChurch(id,i),G.of<c.level*55);});
  }
  if(ielbC.length){
    addT(body,'Produção deste Estado');
    const mul=STATE_MULTI[id]||{fe:1,of:1};const tf=ielbC.reduce((a,c)=>a+c.members,0);
    const stateFe=ielbC.reduce((a,c,i)=>a+Math.sqrt(Math.max(0,c.members))*FAITH_ROOT_GAIN*(1+(c.level-1)*0.22)*mul.fe*(i===0?1:1/(1+i*EXTRA_CHURCH_DIMINISH))*G.mods.doctrineGrowth*ECONOMY_SCALE,0);
    const stateOf=ielbC.reduce((a,c,i)=>a+churchInternalBalance(id,i).income,0);
    addR(body,'Fé/mês','+'+stateFe.toFixed(2));
    addR(body,'Ofertas brutas/mês','+'+stateOf.toFixed(2));
    addR(body,'Membros IELB',Math.floor(tf));
  }
}

function addT(p,t){const d=document.createElement('div');d.className='stit';d.textContent=t;p.appendChild(d);}
function addR(p,l,v){const d=document.createElement('div');d.className='srow';d.innerHTML='<span class="sl">'+l+'</span><span class="sv">'+v+'</span>';p.appendChild(d);}
function addColorRow(p,d,v){const r=document.createElement('div');r.className='srow';r.innerHTML='<span class="sl" style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:'+DENOMS[d].color+';display:inline-block;flex-shrink:0"></span>'+DENOMS[d].name+'</span><span class="sv">'+v+'</span>';p.appendChild(r);}
function addBtn(p,lbl,note,cls,fn,dis,bid){const b=document.createElement('button');b.className='sbtn'+(cls?' '+cls:'');if(dis)b.disabled=true;if(bid)b.id=bid;b.innerHTML=lbl+'<span class="sn">'+note+'</span>';b.onclick=fn;p.appendChild(b);}

function churchPlantCost(id){return Math.max(35,G.states[id].denomData.IELB.churches.length*35+totalChurches('IELB')*4);}
function generalActionBlocked(){if(!G.paused)return false;setTick('O jogo está pausado. Retome o tempo para realizar culto e catecismo.');return true;}
function sendMission(id){const slot=G.states[id].denomData.IELB;const p=availablePastor();if(!p){setTick('Sem pastores disponíveis. Aguarde as próximas formaturas.');return;}if(G.of<PASTOR_SEND_COST||G.fi<10)return;G.of-=PASTOR_SEND_COST;G.fi-=10;removeAvailablePastor(p.id);p.assignedStateId=id;p.assignedChurchIndex=null;G.states[id].missionary=true;G.states[id].missionProg=0;G.states[id].missionPastorId=p.id;redrawDots();renderLeft();renderRight();updateRes();setTick('Pastor '+p.name+' enviado para '+STATES[id].name+'. A implantação levará tempo.');}
function newDedicatedChurch(id){showChurchCityModal(id);}
function showChurchCityModal(id){
  const slot=G.states[id].denomData.IELB;
  const cost=PLAYER_EXPANSION_COST;
  const p=availablePastor();
  if(G.of<cost||G.fi<10||!p)return;
  const wasPaused=G.paused;
  G.paused=true;
  document.getElementById('pausebtn').textContent='▶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='MISSÃO';tag.className='good';
  document.getElementById('m-title').textContent='Abrir missão neste estado';
  document.getElementById('m-yr').textContent=STATES[id].name;
  document.getElementById('m-txt').textContent='Como ainda não há presença da IELB neste estado, um pastor disponível será enviado para iniciar a missão.';
  const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Pastor dedicado: '+p.name+' | Custo: '+cost+' Ofertas + 10 Membros';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  missionCityOptions(id).forEach(city=>{
    const b=document.createElement('button');b.className='mcbtn';b.textContent=city;
    b.onclick=()=>commitDedicatedChurch(id,city,wasPaused);
    mc.appendChild(b);
  });
  const cancel=document.createElement('button');cancel.className='mcbtn';cancel.textContent='Cancelar';cancel.onclick=()=>closeMissionCityModal(wasPaused);mc.appendChild(cancel);
  modal.classList.add('show');
}
function commitDedicatedChurch(id,city,wasPaused){
  const slot=G.states[id].denomData.IELB;
  const cost=PLAYER_EXPANSION_COST;
  const p=availablePastor();
  if(!p||G.of<cost||G.fi<10){closeMissionCityModal(wasPaused);return;}
  G.of-=cost;G.fi-=10;
  const ch=addChurch(id,'IELB',12,1,G.year,'missao',city);
  const idx=slot.churches.indexOf(ch);
  assignPastorToChurch(p,id,idx);
  recalc();redrawDots();renderLeft();renderRight();updateRes();
  setTick('Missão aberta em '+ch.city+', '+STATES[id].name+' — Pastor '+p.name+' dedicado ao novo campo.');
  closeMissionCityModal(wasPaused);
}
function missionCityOptions(id){
  const pool=STATE_CITIES[id]||[STATES[id].name];
  return pool.slice(0,10);
}
function closeMissionCityModal(wasPaused){
  document.getElementById('modal').classList.remove('show');
  G.paused=wasPaused;
  document.getElementById('pausebtn').textContent=G.paused?'▶ Retomar':'⏸ Pausar';
  renderRight();updateRes();
}
function showMissionCityModal(id){
  const slot=G.states[id].denomData.IELB;
  const cost=PLAYER_EXPANSION_COST;
  const route=routePastorForNewChurch(id);
  const dedicated=availablePastor();
  if(G.of<cost||G.fi<10||(!route&&!dedicated))return;
  const wasPaused=G.paused;
  G.paused=true;
  document.getElementById('pausebtn').textContent='▶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='MISSÃO';tag.className='good';
  document.getElementById('m-title').textContent='Abrir mais um ponto de missão no estado';
  document.getElementById('m-yr').textContent=STATES[id].name;
  document.getElementById('m-txt').textContent='Escolha a cidade onde a missão será aberta.';
  const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Custo: '+cost+' Ofertas + 10 Membros';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  missionCityOptions(id).forEach(city=>{
    const b=document.createElement('button');b.className='mcbtn';b.textContent=city;
    b.onclick=()=>showMissionPastorChoice(id,city,wasPaused);
    mc.appendChild(b);
  });
  const cancel=document.createElement('button');cancel.className='mcbtn';cancel.textContent='Cancelar';cancel.onclick=()=>closeMissionCityModal(wasPaused);mc.appendChild(cancel);
  modal.classList.add('show');
}
function openMission(id){showMissionCityModal(id);}
function showMissionPastorChoice(id,city,wasPaused){
  const cost=PLAYER_EXPANSION_COST;
  const route=routePastorForNewChurch(id,city);
  const dedicated=availablePastor();
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='MISSÃO';tag.className='good';
  document.getElementById('m-title').textContent='Definir pastor da missão';
  document.getElementById('m-yr').textContent=city+', '+STATES[id].name;
  document.getElementById('m-txt').textContent='Escolha se este ponto ficará com um pastor já em atividade no estado ou com um novo pastor disponível.';
  const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Custo: '+cost+' Ofertas + 10 Membros';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  if(route){
    const b=document.createElement('button');b.className='mcbtn';b.textContent='Usar pastor já em atividade';
    b.onclick=()=>commitMissionPoint(id,city,wasPaused,'route');
    mc.appendChild(b);
  }
  if(dedicated){
    const b=document.createElement('button');b.className='mcbtn';b.textContent='Enviar um novo pastor disponível';
    b.onclick=()=>commitMissionPoint(id,city,wasPaused,'dedicated');
    mc.appendChild(b);
  }
  const back=document.createElement('button');back.className='mcbtn';back.textContent='Voltar para cidades';back.onclick=()=>showMissionCityModal(id);mc.appendChild(back);
  const cancel=document.createElement('button');cancel.className='mcbtn';cancel.textContent='Cancelar';cancel.onclick=()=>closeMissionCityModal(wasPaused);mc.appendChild(cancel);
  modal.classList.add('show');
}
function commitMissionPoint(id,city,wasPaused,mode='route'){
  const slot=G.states[id].denomData.IELB;
  const cost=PLAYER_EXPANSION_COST;
  const route=mode==='dedicated'?null:routePastorForNewChurch(id,city);
  const dedicated=mode==='dedicated'?availablePastor():null;
  const pastor=dedicated||route;
  if(!pastor||G.of<cost||G.fi<10){closeMissionCityModal(wasPaused);return;}
  G.of-=cost;G.fi-=10;
  const ch=addChurch(id,'IELB',12,1,G.year,'missao',city);
  const idx=slot.churches.indexOf(ch);
  if(dedicated)assignPastorToChurch(dedicated,id,idx);
  else {addPastorRoute(route,idx);ch.pastorId=route.id;}
  recalc();redrawDots();renderLeft();renderRight();updateRes();
  setTick('Ponto de missão aberto em '+ch.city+', '+STATES[id].name+' — Pastor '+pastor.name+(dedicated?' dedicado ao novo campo.':' encarregado.'));
  closeMissionCityModal(wasPaused);
}
function stateMissionIndexes(id){return G.states[id].denomData.IELB.churches.map((ch,i)=>ch.type==='missao'?i:null).filter(i=>i!==null);}
function missionNeedsNewPastorForPromotion(id,index){
  const ch=G.states[id].denomData.IELB.churches[index];
  const p=ch&&ch.pastorId?getPastor(ch.pastorId):null;
  return !p||pastorRouteIndexes(p).includes(index);
}
function missionPromotionOptions(id){
  return stateMissionIndexes(id).map(index=>{
    const ch=G.states[id].denomData.IELB.churches[index];
    const needsPastor=missionNeedsNewPastorForPromotion(id,index);
    const readyMembers=ch.members>=50;
    const ready=readyMembers&&G.of>=PLAYER_EXPANSION_COST&&(!needsPastor||!!availablePastor());
    return {index,ch,needsPastor,readyMembers,ready};
  });
}
function showPromoteMissionModal(id){
  const options=missionPromotionOptions(id);
  const cost=PLAYER_EXPANSION_COST;
  if(!options.length||G.of<cost)return;
  const wasPaused=G.paused;
  G.paused=true;
  document.getElementById('pausebtn').textContent='▶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='MISSÃO';tag.className='good';
  document.getElementById('m-title').textContent='Transformar missão em igreja';
  document.getElementById('m-yr').textContent=STATES[id].name;
  document.getElementById('m-txt').textContent='Escolha uma missão com pelo menos 50 membros para ser organizada como congregação.';
  const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Custo: '+cost+' Ofertas. Missões atendidas em rota precisam de um pastor disponível para receber pastor próprio.';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  options.forEach(opt=>{
    const b=document.createElement('button');b.className='mcbtn';
    const notes=[];
    if(!opt.readyMembers)notes.push('precisa de 50 membros');
    if(opt.needsPastor&&!availablePastor())notes.push('sem pastor disponível');
    b.textContent=(opt.ch.city||('Missão '+(opt.index+1)))+' — '+Math.floor(opt.ch.members)+' membros'+(notes.length?' | '+notes.join(', '):'');
    b.disabled=!opt.ready;
    b.onclick=()=>promoteMissionToChurch(id,opt.index,wasPaused);
    mc.appendChild(b);
  });
  const cancel=document.createElement('button');cancel.className='mcbtn';cancel.textContent='Cancelar';cancel.onclick=()=>closeMissionCityModal(wasPaused);mc.appendChild(cancel);
  modal.classList.add('show');
}
function promoteMissionToChurch(id,index,wasPaused){
  const slot=G.states[id].denomData.IELB;
  const ch=slot.churches[index];
  const cost=PLAYER_EXPANSION_COST;
  if(!ch||ch.type!=='missao'||ch.members<50||G.of<cost){closeMissionCityModal(wasPaused);return;}
  const needsPastor=missionNeedsNewPastorForPromotion(id,index);
  const p=needsPastor?availablePastor():getPastor(ch.pastorId);
  if(!p){closeMissionCityModal(wasPaused);return;}
  G.of-=cost;
  const oldPastor=ch.pastorId?getPastor(ch.pastorId):null;
  if(needsPastor&&oldPastor&&pastorRouteIndexes(oldPastor).includes(index))removePastorRoute(oldPastor,index);
  ch.type='congregacao';
  ch.secondPastorId=null;
  if(needsPastor){ch.pastorId=null;assignPastorToChurch(p,id,index);}
  ch.stagnantMonths=0;
  ch._stagnationWindowStart=ch.members;
  ch._stagnationMonths=0;
  ch.failedEvangelismAttempts=0;
  ch.failedStewardshipAttempts=0;
  ch.struggleMonths=0;
  recalc();redrawDots();renderLeft();renderRight();updateRes();
  setTick('Missão em '+(ch.city||STATES[id].name)+' organizada como congregação — Pastor '+p.name+' responsável.');
  closeMissionCityModal(wasPaused);
}
const CULT_CLICK_LIMIT=3;
const CULT_CLICK_WINDOW_MS=1000;
let cultClickTimes=[];
function canRegisterCultClick(){
  const now=performance.now();
  cultClickTimes=cultClickTimes.filter(t=>now-t<CULT_CLICK_WINDOW_MS);
  if(cultClickTimes.length>=CULT_CLICK_LIMIT)return false;
  cultClickTimes.push(now);
  return true;
}
function culto(){
  if(generalActionBlocked())return;
  if(!canRegisterCultClick()){setTick('Ritmo mÃ¡ximo de cultos atingido: 3 por segundo.');return;}
  G.fe=Math.min(G.fe+4,9999);setTick('Culto realizado.');updateRes();renderRight();
}
function ielbChurchRefs(){
  const refs=[];
  ALL_STATES.forEach(id=>G.states[id].denomData.IELB.churches.forEach((ch,index)=>refs.push({id,index,ch})));
  return refs;
}
function addMembersToIelbChurches(amount,preferStateId=null){
  const refs=ielbChurchRefs();
  if(!refs.length||amount<=0)return null;
  const pool=preferStateId?refs.filter(r=>r.id===preferStateId):refs;
  const chosenPool=pool.length?pool:refs;
  const share=amount/chosenPool.length;
  let last=null;
  chosenPool.forEach(r=>{
    r.ch.members+=share;
    r.ch.stagnantMonths=0;
    r.ch._stagnationWindowStart=r.ch.members;
    r.ch._stagnationMonths=0;
    syncDenomMembers(r.id,'IELB');
    last=r;
  });
  return last;
}
function catecismo(){
  if(generalActionBlocked())return;
  if(G.fe<25){setTick('Fé insuficiente.');return;}
  G.fe-=25;
  G.fi=Math.min(G.fi+5,9999);
  addMembersToIelbChurches(5,G.sel!=='BR'?G.sel:null);
  recalc();
  setTick('Catecismo concluído: +5 membros integrados às comunidades.');
  updateRes();renderLeft();renderRight();redrawDots();
}
function assignAvailablePastorAction(id,i,second=false){
  const p=availablePastor();
  if(!p||G.of<PASTOR_SEND_COST)return;
  G.of-=PASTOR_SEND_COST;
  const ch=G.states[id].denomData.IELB.churches[i];
  if(second&&ch.pastorId){
    removeAvailablePastor(p.id);
    p.assignedStateId=id;p.assignedChurchIndex=i;p.isOnRoute=false;p.routeChurchIndex=null;p.routeChurchIndexes=[];
    ch.secondPastorId=p.id;
    G.pastors.forEach(x=>{if(x.assignedStateId===id&&pastorRouteIndexes(x).includes(i))removePastorRoute(x,i);});
    ch.overloadSince=null;
  }else{
    G.pastors.forEach(x=>{if(x.assignedStateId===id&&pastorRouteIndexes(x).includes(i))removePastorRoute(x,i);});
    ch.pastorId=null;ch.secondPastorId=null;
    assignPastorToChurch(p,id,i);
  }
  recalc();renderLeft();renderRight();updateRes();setTick('Pastor '+p.name+' enviado para a Igreja '+(i+1)+' em '+STATES[id].name+'.');
}

function churchIntervention(id,i){const ch=G.states[id].denomData.IELB.churches[i];if(G.fe<20)return;G.fe-=20;if(Math.random()<0.6){const newMembers=randInt(5,15);ch.members+=newMembers;ch.struggleMonths=0;ch.struggling=false;const dilution=newMembers/ch.members;ch.offerRate=Math.max(0.15,ch.offerRate*(1-dilution*0.4));setTick('Campanha em '+STATES[id].name+': +'+newMembers+' membros. Taxa de oferta: '+Math.round(ch.offerRate*100)+'%.');}else setTick('A campanha não surtiu efeito suficiente em '+STATES[id].name+'.');recalc();renderLeft();renderRight();updateRes();}
function togglePause(){G.paused=!G.paused;document.getElementById('pausebtn').textContent=G.paused?'▶ Retomar':'⏸ Pausar';renderRight();}
function setSpeed(speed){G.speed=speed;['speedhalfbtn','speedbtn','speedfastbtn'].forEach(id=>{const b=document.getElementById(id);if(b)b.classList.remove('active-speed');});const activeId=speed===0.5?'speedhalfbtn':speed===2?'speedfastbtn':'speedbtn';const active=document.getElementById(activeId);if(active)active.classList.add('active-speed');}
function toggleSpeed(){setSpeed(G.speed===1?2:1);}
function setMobilePanel(panel){
  document.body.classList.toggle('mobile-panel-info',panel==='info');
  document.body.classList.toggle('mobile-panel-actions',panel==='actions');
  const ti=document.getElementById('tab-info'), ta=document.getElementById('tab-actions');
  if(ti&&ta){ti.classList.toggle('active',panel==='info');ta.classList.toggle('active',panel==='actions');}
}
// painel atualizado: gestão real por pastores, rota e sustento congregacional.
function renderRight(){
  const id=G.sel;if(id==='BR')return renderBrazilRight();
  document.getElementById('right-sub').textContent=id?STATES[id].name:'Brasil';
  const body=document.getElementById('right-body');body.innerHTML='';
  const st=G.states[id], ielbC=st.denomData.IELB.churches, ielbSlot=st.denomData.IELB;
  addT(body,'Ações neste Estado');
  if(!st.missionary&&!ielbC.length){
    const firstCost=PLAYER_EXPANSION_COST;
    addBtn(body,'Abrir missão neste estado','Pastor disponível | Custo: '+firstCost+' Ofertas + 10 Membros','miss',()=>newDedicatedChurch(id),G.of<firstCost||G.fi<10||!G.availablePastors.length);
  }
  if(ielbC.length){
    const cost=PLAYER_EXPANSION_COST;
    const canOpenMission=!!routePastorForNewChurch(id)||!!availablePastor();
    addBtn(body,'Abrir mais um ponto de missão no estado','Custo: '+cost+' Ofertas + 10 Membros','miss',()=>openMission(id),G.of<cost||G.fi<10||!canOpenMission);
    const promoOptions=missionPromotionOptions(id);
    if(promoOptions.length){
      const promoReady=promoOptions.some(o=>o.ready);
      addBtn(body,'Transformar missão em igreja','Custo: '+cost+' Ofertas | exige 50 membros'+(G.availablePastors.length?'':' | sem pastor disponível'),'miss',()=>showPromoteMissionModal(id),G.of<cost||!promoReady);
    }
    addT(body,'Pontos neste Estado');
    ielbC.forEach((c,i)=>{
      const ps=pastoralStatus(id,i);
      const pastor=c.pastorId?getPastor(c.pastorId):null;
      const pastorName=pastor?pastor.name:'sem pastor';
      const typeLabel=c.type==='missao'?'Missão':'Congregação';
      const row=document.createElement('div');row.className='srow';row.style.flexDirection='column';row.style.alignItems='flex-start';row.style.gap='2px';row.style.padding='6px 0';
      const bal=churchInternalBalance(id,i);
      const balColor=bal.net<0?'#c62828':'#2e7d32';
      const balText=bal.net<0?'Saldo local: −'+Math.abs(bal.net).toFixed(2)+'/mês':'Saldo local: +'+bal.net.toFixed(2)+'/mês';
      row.innerHTML='<span style="font-weight:600;color:#2a1800">'+typeLabel+' — '+(c.city||STATES[id].name)+'</span>'
        +'<span style="font-size:12px;color:#7a6a40">'+Math.floor(c.members)+' membros · oferta '+Math.round((c.offerRate||0.7)*100)+'%</span>'
        +'<span style="font-size:12px;color:#7a6a40">'+ps.label+': '+pastorName+(c.secondPastorId?' + '+(getPastor(c.secondPastorId)?getPastor(c.secondPastorId).name:'2º pastor'):'')+'</span>'
        +'<span style="font-size:12px;font-weight:600;color:'+balColor+'">'+balText+(c.subsidized?' · subsidiada '+(c.subsidyMonths||0)+'/'+CHURCH_SUBSIDY_MONTHS:'')+'</span>'
        +'<span style="font-size:11px;color:'+(churchOrganicMemberRate(id,i)<0?'#c62828':'#7a6a40')+'">Membros/mês: '+fmtRate(churchOrganicMemberRate(id,i),2)+' · '+churchMemberTrendReason(id,i)+'</span>'
        +(c.type==='missao'?'<span style="font-size:11px;color:#7a6a40">Promoção: '+Math.floor(c.members)+'/50 membros</span>':'')
        +(c.struggleMonths>=3?'<span style="font-size:11px;color:#c62828">Dificuldade há '+c.struggleMonths+' meses</span>':'');
      body.appendChild(row);
      if(!pastorForChurch(id,i)&&G.availablePastors.length)addBtn(body,'Enviar pastor — '+(c.city||'Igreja '+(i+1)),'Custo: '+PASTOR_SEND_COST+' Ofertas','miss',()=>assignAvailablePastorAction(id,i),G.of<PASTOR_SEND_COST);
      if(churchNeedsPastorRelief(id,i))addBtn(body,(c.type==='missao'?'Enviar pastor encarregado — ':'Enviar segundo pastor — ')+(c.city||'Igreja '+(i+1)),G.availablePastors.length?'Custo: '+PASTOR_SEND_COST+' Ofertas':'Aguardando pastor disponível','miss',()=>showSecondPastorModal(id,i,false),!G.availablePastors.length||G.of<PASTOR_SEND_COST);
    });
    addT(body,'Produção deste Estado');
    const mul=STATE_MULTI[id]||{fe:1,of:1};const tf=ielbC.reduce((a,c)=>a+c.members,0);
    const stateFe=ielbC.reduce((a,c,i)=>{const ps=pastoralStatus(id,i);return a+Math.sqrt(Math.max(0,c.members))*FAITH_ROOT_GAIN*(1+(c.level-1)*0.22)*mul.fe*ps.memberMult*(i===0?1:1/(1+i*EXTRA_CHURCH_DIMINISH))*G.mods.doctrineGrowth*ECONOMY_SCALE;},0);
    const stateOf=ielbC.reduce((a,c,i)=>a+churchInternalBalance(id,i).income,0);
    const stateCost=ielbC.reduce((a,c,i)=>a+churchInternalBalance(id,i).cost,0);
    addR(body,'Fé/mês','+'+stateFe.toFixed(2));
    addR(body,'Ofertas locais/mês','+'+stateOf.toFixed(2));
    addR(body,'Custo local/mês','-'+stateCost.toFixed(2));
    addR(body,'Saldo local/mês',(stateOf-stateCost>=0?'+':'')+(stateOf-stateCost).toFixed(2));
    addR(body,'Membros IELB',Math.floor(tf));
  }
}
function startGame(){
  G.started=true;G.paused=false;
  document.getElementById('start-screen').style.display='none';
  document.getElementById('pausebtn').textContent='⏸ Pausar';
  recalc();updateRes();renderLeft();renderRight();
}
function endCampaign(win,msg){
  if(G.gameOver)return;
  G.gameOver=true;G.paused=true;
  const screen=document.getElementById('start-screen');
  const card=document.getElementById('start-card');
  card.innerHTML='<h1>'+(win?'Campanha concluída':'Campanha encerrada')+'</h1><div class="goal"><p>'+msg+'</p></div><p>Avaliação final: '+Math.floor(totalChurches('IELB'))+' igrejas, '+Math.floor(totalMembers('IELB'))+' membros, '+activePastors().length+' pastores ativos.</p><button onclick="location.reload()">Recomeçar</button>';
  screen.style.display='flex';
  document.getElementById('pausebtn').textContent='▶ Retomar';
}
function nationalInfluence(d){
  return ALL_STATES.reduce((a,id)=>a+G.states[id].denomData[d].influence,0);
}
function competitiveDenomKeys(){return DENOM_KEYS.filter(d=>d!=='CAT');}
function checkCampaignGoal(){
  if(G.gameOver)return;
  if(G.year<2025)return;
  const ranking=competitiveDenomKeys().map(d=>[d,nationalInfluence(d)]).sort((a,b)=>b[1]-a[1]);
  const place=ranking.findIndex(([d])=>d==='IELB')+1;
  if(place<=2&&G.of>=0&&totalChurches('IELB')>=12&&uncoveredChurches().length<4){
    endCampaign(true,'Você chegou a 2025 com a IELB entre as maiores influências nacionais e com estrutura sustentável.');
  }else if(G.of<=0&&G.rateOf<0){
    endCampaign(false,'A IELB chegou ao período final enfraquecida financeiramente. A missão cresceu, mas a estrutura não se sustentou.');
  }
}

// IA rival: mesma lógica básica da IELB, mas automatizada.
// A cada mês cada denominação avalia uma ação; sem cooldown artificial, o recurso acumulado decide o ritmo.
function rivalStrategicTurn(){
  ensureScheduledFoundations();
  DENOM_KEYS.forEach(d=>{
    if(d==='IELB'||d==='CAT'||!G.foundedDenoms.has(d)) return;
    const info=DENOMS[d];
    info.resource+=(1.1+Math.sqrt(Math.max(0,totalMembers(d)))*0.08+totalChurches(d)*0.35)*info.growth;
    const present=ALL_STATES.filter(id=>churchCount(id,d)>0);
    if(!present.length) return;
    if(info.resource>10&&totalChurches(d)>rivalAdminCapacity(d)){
      info.resource-=6;
      info.adminCapacity++;
      return;
    }
    const action=info.resource<0?'members':chooseRivalAction(d,present);
    if(action==='newState'){
      const candidates=ALL_STATES.filter(id=>churchCount(id,d)===0).sort((a,b)=>stateOpportunity(b,d)-stateOpportunity(a,d));
      const target=weightedPick(candidates.slice(0,7));
      const cost=rivalCost(d,'newState',target);
      if(target&&info.resource>=cost){addChurch(target,d,profileMembers(d),1,G.year);info.resource-=cost;return;}
    }
    const target=weightedPick(present.slice().sort((a,b)=>stateOpportunity(b,d)-stateOpportunity(a,d)).slice(0,6));
    if(!target)return;
    const slot=G.states[target].denomData[d];
    const ch=slot.churches[Math.floor(Math.random()*slot.churches.length)];
    if(action==='sameState'){
      const cost=rivalCost(d,'sameState',target);
      if(info.resource>=cost){addChurch(target,d,profileMembers(d)*1.1,1,G.year);info.resource-=cost;return;}
    }
    if(action==='level'&&ch&&ch.level<5){
      const cost=rivalCost(d,'level',target,ch);
      if(info.resource>=cost){ch.level++;ch.members+=Math.max(1,profileMembers(d)*0.18);info.resource-=cost;return;}
    }
    const growCost=rivalCost(d,'members',target,ch);
    if(ch&&info.resource>=growCost){ch.members+=Math.max(1,profileMembers(d)*0.28);info.resource-=growCost;}
  });
  recalc();buildLegend();redrawDots();renderLeft();renderRight();
}

function chooseRivalAction(d,present){
  const churches=totalChurches(d), roll=Math.random(), profile=DENOMS[d].profile;
  const newStateBias=(profile==='aggressive'||profile==='pentecostal')?0.3:profile==='fast'?0.22:0.15;
  const sameStateBias=(profile==='aggressive'||profile==='pentecostal')?0.32:0.25;
  const levelBias=(profile==='moderate'||profile==='historic')?0.28:0.2;
  if(churches<2&&roll<0.35)return 'sameState';
  if(roll<newStateBias&&present.length<ALL_STATES.length)return 'newState';
  if(roll<newStateBias+sameStateBias)return 'sameState';
  if(roll<newStateBias+sameStateBias+levelBias)return 'level';
  return 'members';
}

function rivalCost(d,action,id,ch){
  const pop=Math.sqrt((STATE_POP[id]||100)/250);
  const profile=DENOMS[d].profile;
  const speedDiscount=(profile==='aggressive'||profile==='pentecostal')?0.82:profile==='fast'?0.9:1;
  if(action==='newState')return 4.5*pop*speedDiscount;
  if(action==='sameState')return 3.6*pop*speedDiscount+churchCount(id,d)*0.85;
  if(action==='level')return ((ch?.level||1)*3.1+1.2)*speedDiscount;
  return 1.7*speedDiscount;
}

function weightedPick(list){
  if(!list.length)return null;
  const idx=Math.min(list.length-1,Math.floor(Math.pow(Math.random(),1.7)*list.length));
  return list[idx];
}

function profileMembers(d){
  if(d==='AD'||d==='IURD') return 10+Math.random()*6;
  if(d==='CCB'||d==='PP') return 8+Math.random()*5;
  return 6+Math.random()*4;
}
function stateOpportunity(id,d){
  const pop=STATE_POP[id]||100, urban=G.states[id].modifiers.urban||1, rec=G.states[id].modifiers.receptivity||1;
  const pent=(d==='AD'||d==='IURD')?urban*1.25:1;
  const crowded=DENOM_KEYS.reduce((a,k)=>a+churchCount(id,k),0);
  return pop*0.01*rec*pent/(1+crowded*0.18)+Math.random()*2;
}

function processEventQueue(){
  if(G.eventQueue.length){
    const next=G.eventQueue.shift();
    if(next.type==='formation')showFormationModal(next);
    else if(next.type==='subsidy')showSubsidyModal(next);
    else if(next.type==='pastorExit')showPastorExitModal(next);
    else if(next.type==='theologyQuestion')showTheologyQuestionModal(next.question);
    return;
  }
  if(G.annualDecisions.length)showChurchDecision(G.annualDecisions.shift());
}

function showFormationModal(ev){
  G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='SEMINÁRIO';tag.className='good';
  const firstClass=ev.entryYear===1908;
  document.getElementById('m-title').textContent=firstClass?'Primeira turma formada':'Formatura pastoral';
  document.getElementById('m-yr').textContent='Seminário Concórdia, '+ev.gradYear;
  const dropout=ev.left!==undefined?ev.left:Math.max(0,ev.enrolled-ev.formed);
  document.getElementById('m-txt').textContent=
    'De '+ev.enrolled+' jovens que ingressaram em '+ev.entryYear+', '+ev.formed+' concluíram o curso e agora estão disponíveis para envio.'+(dropout>0?' '+dropout+' deixaram o seminário e não se formaram.':' Todos os alunos da turma chegaram à formatura.');
  const ref=document.getElementById('m-ref');ref.style.display='block';
  const names=(ev.names&&ev.names.length?ev.names:['Pastor recém-formado']);
  ref.innerHTML='<strong>Se formaram os pastores:</strong><div class="pastor-list">'+names.map(n=>'<div class="pastor-name">'+n+'</div>').join('')+'</div>';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  const btn=document.createElement('button');btn.className='mcbtn';btn.textContent='Continuar';
  btn.onclick=()=>{document.getElementById('modal').classList.remove('show');G.paused=false;document.getElementById('pausebtn').textContent='⏸ Pausar';recalc();updateRes();renderLeft();renderRight();redrawDots();processEventQueue();};
  mc.appendChild(btn);
  modal.classList.add('show');
}

function showSubsidyModal(ev){
  G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='SEMINÁRIO';tag.className='warn';
  document.getElementById('m-title').textContent='Pedido de subsídio — Turma '+ev.year;
  document.getElementById('m-yr').textContent='Seminário Concórdia, '+ev.year;
  const monthly=(ev.count*SEMINARY_SUBSIDY_PER_STUDENT).toFixed(2);
  document.getElementById('m-txt').textContent=
    ev.count+' seminaristas da turma '+ev.year+' não têm condições de custear os estudos e solicitam subsídio da IELB. Se concedido, o custo mensal adicional será de -'+monthly+' ofertas/mês enquanto estiverem cursando ('+SEMINARY_YEARS+' anos).';
  const ref=document.getElementById('m-ref');ref.style.display='none';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  const yes=document.createElement('button');yes.className='mcbtn';yes.textContent='Conceder subsídio (−'+monthly+'/mês)';
  yes.onclick=()=>{
    ev.cohort.subsidyCount=(ev.cohort.subsidyCount||0)+ev.count;
    closeDecisionModal('Subsídio concedido. '+ev.count+' seminaristas receberão apoio da IELB durante o curso.');
  };
  mc.appendChild(yes);
  const no=document.createElement('button');no.className='mcbtn';no.textContent='Negar o pedido';
  no.onclick=()=>{closeDecisionModal('Pedido negado. Os seminaristas continuarão sem apoio financeiro institucional.','bad');};
  mc.appendChild(no);
  modal.classList.add('show');
}

function showPastorExitModal(ev){
  G.paused=true;document.getElementById('pausebtn').textContent='â–¶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');
  const isDeath=ev.kind==='death';
  tag.textContent=isDeath?'LUTO':'PASTORADO';
  tag.className=isDeath?'bad':'warn';
  document.getElementById('m-title').textContent=isDeath?'Falecimento de pastor':'Pastor emérito';
  document.getElementById('m-yr').textContent='Relatório anual de '+ev.year;
  document.getElementById('m-txt').textContent=isDeath
    ? 'O pastor '+ev.name+' faleceu após '+ev.years+' anos de ministério. A comunidade que ele atendia pode ficar sem pastor até que outro seja enviado.'
    : 'O pastor '+ev.name+' se tornou pastor emérito após '+ev.years+' anos de ministério. A comunidade que ele atendia pode precisar de um novo pastor.';
  const ref=document.getElementById('m-ref');
  ref.style.display='block';
  ref.textContent='Campo atendido: '+(ev.stateName||'sem campo')+'. Pastores disponíveis agora: '+G.availablePastors.length+'.';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  const btn=document.createElement('button');
  btn.className='mcbtn';
  btn.textContent='Continuar';
  btn.onclick=()=>{document.getElementById('modal').classList.remove('show');G.paused=false;document.getElementById('pausebtn').textContent='â¸ Pausar';recalc();updateRes();renderLeft();renderRight();redrawDots();processEventQueue();};
  mc.appendChild(btn);
  modal.classList.add('show');
}

function showTheologyQuestionModal(question){
  G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='CATECISMO';tag.className='doctrine';
  document.getElementById('m-title').textContent='Pergunta de doutrina';
  document.getElementById('m-yr').textContent='Relatório de '+G.year;
  document.getElementById('m-txt').textContent=question.q;
  const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Resposta correta: +20 membros e +20 ofertas.';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  question.a.forEach((answer,index)=>{
    const btn=document.createElement('button');
    btn.className='mcbtn';
    btn.textContent=String.fromCharCode(65+index)+') '+answer;
    btn.onclick=()=>resolveTheologyQuestion(question,index);
    mc.appendChild(btn);
  });
  modal.classList.add('show');
}

function resolveTheologyQuestion(question,index){
  const mc=document.getElementById('m-choices');
  [...mc.querySelectorAll('.mcbtn')].forEach(b=>b.disabled=true);
  const correct=index===question.correct;
  if(correct){
    G.of+=20;
    addMembersToIelbChurches(20,G.sel!=='BR'?G.sel:null);
  }else{
    G.doc=Math.max(0,G.doc-8);
    ielbChurchRefs().forEach(r=>{r.ch.members=Math.max(1,(r.ch.members||1)-30);syncDenomMembers(r.id,'IELB');});
  }
  const result=document.createElement('div');
  result.className='event-result '+(correct?'good':'bad');
  result.textContent=correct?'Resposta correta: +20 membros e +20 ofertas.':'Resposta incorreta: doutrina enfraquecida e -30 membros por igreja.';
  mc.appendChild(result);
  const cont=document.createElement('button');
  cont.className='mcbtn';
  cont.textContent='Continuar';
  cont.onclick=()=>{document.getElementById('modal').classList.remove('show');G.paused=false;document.getElementById('pausebtn').textContent='⏸ Pausar';recalc();updateRes();renderLeft();renderRight();redrawDots();processEventQueue();};
  mc.appendChild(cont);
  recalc();updateRes();renderLeft();renderRight();redrawDots();
}

function showSecondPastorModal(stateId,index,fromAnnual=false){
  const ch=G.states[stateId].denomData.IELB.churches[index];
  if(!ch)return;
  const currentPastor=pastorForChurch(stateId,index);
  const load=currentPastor?pastorMemberLoad(currentPastor,stateId):ch.members;
  const needsOwnPastor=ch.type==='missao'&&currentPastor&&pastorRouteIndexes(currentPastor).includes(index);
  const loadOverloaded=currentPastor&&load>=300&&!ch.secondPastorId;
  const ownLarge=ch.type==='congregacao'&&ch.members>=300&&!ch.secondPastorId;
  G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='PASTORADO';tag.className='warn';
  document.getElementById('m-title').textContent=needsOwnPastor?'Pastor sobrecarregado':'Segundo pastor necessário';
  document.getElementById('m-yr').textContent=(ch.city||STATES[stateId].name)+' — '+Math.floor(ch.members)+' membros | carga pastoral: '+Math.floor(load);
  document.getElementById('m-txt').textContent=needsOwnPastor
    ? 'O pastor '+currentPastor.name+' ja atende comunidades que somam '+Math.floor(load)+' membros. Envie um pastor para ficar encarregado desta missao.'
    : (loadOverloaded&&!ownLarge
      ? 'O pastor '+currentPastor.name+' atende comunidades que somam '+Math.floor(load)+' membros. Enviar um segundo pastor para esta comunidade reduz a sobrecarga pastoral.'
      : 'Esta congregação passou de 300 membros e já está pesada demais para apenas um pastor. Enviar um segundo pastor reduz a sobrecarga pastoral.');
  const ref=document.getElementById('m-ref');ref.style.display='block';
  const p=availablePastor();
  ref.textContent=p?'Pastor disponível: '+p.name+' | Custo: '+PASTOR_SEND_COST+' Ofertas':'Nenhum pastor disponível agora. Você pode pular e voltar quando houver formatura.';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  if(p){
    const send=document.createElement('button');send.className='mcbtn';send.textContent=needsOwnPastor?'Enviar pastor encarregado':'Enviar segundo pastor';send.disabled=G.of<PASTOR_SEND_COST;
    send.onclick=()=>{assignAvailablePastorAction(stateId,index,!needsOwnPastor);ch.lastSecondPastorDecisionYear=G.year;closeDecisionModal((needsOwnPastor?'Pastor encarregado enviado para ':'Segundo pastor enviado para ')+(ch.city||STATES[stateId].name)+'.');};
    mc.appendChild(send);
  }
  const skip=document.createElement('button');skip.className='mcbtn';skip.textContent=fromAnnual?'Pular por enquanto':'Cancelar';
  skip.onclick=()=>{ch.lastSecondPastorDecisionYear=G.year;closeDecisionModal(fromAnnual?'A decisão foi adiada. A necessidade volta no próximo relatório anual se a sobrecarga continuar.':'Nenhum pastor foi enviado agora.','bad');};
  mc.appendChild(skip);
  modal.classList.add('show');
}



function showChurchDecision(item){
  if(item.reason==='secondPastor')return showSecondPastorModal(item.stateId,item.index,true);
  G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='GESTÃO';tag.className='warn';
  const ch=item.ch, bal=churchInternalBalance(item.stateId,item.index);
  const cityLabel=ch.city?ch.city+', ':'';
  const isMission=ch.type==='missao';
  const kind=isMission?'missão':'congregação';
  const stagnant=item.reason==='stagnant';
  ch.lastStagnationDecisionYear=stagnant?G.year:ch.lastStagnationDecisionYear;
  document.getElementById('m-title').textContent=(isMission?'Missão':'Congregação')+' em '+cityLabel+STATES[item.stateId].name+' — '+(stagnant?'Sem crescimento':'Dificuldade');
  document.getElementById('m-yr').textContent='Relatório anual de '+G.year;
  document.getElementById('m-txt').textContent=stagnant
    ? 'Esta '+kind+' tem '+Math.floor(ch.members)+' membros e cresceu menos de 10 membros nos últimos 3 anos. Ela ainda pode estar pagando as contas, mas o campo estacionou.'
    : 'Esta '+kind+' tem '+Math.floor(ch.members)+' membros e não consegue se sustentar há '+ch.struggleMonths+' meses. Déficit mensal estimado: '+bal.deficit.toFixed(2)+' Ofertas. Taxa de oferta atual: '+Math.round((ch.offerRate||0.7)*100)+'%.';
  const ref=document.getElementById('m-ref');
  if(stagnant){ref.style.display='block';ref.textContent='Tentativas de evangelismo sem fruto: '+(ch.failedEvangelismAttempts||0)+'/3.';}
  else {ref.style.display='block';ref.textContent='Tentativas de mordomia cristã sem efeito: '+(ch.failedStewardshipAttempts||0)+'/2.';}
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  if(!stagnant&&(ch.failedStewardshipAttempts||0)>=2){
    showDeficitFinalChoice(item,kind);
    modal.classList.add('show');
    return;
  }
  if(stagnant){
    const evang=document.createElement('button');evang.className='mcbtn';evang.textContent='Campanha de evangelismo (20 Fé | 60% de chance)';evang.disabled=G.fe<20;evang.onclick=()=>{
      G.fe-=20;
      if(Math.random()<0.6){
        const n=randInt(8,18);
        ch.members+=n;
        ch.struggleMonths=0;
        ch.stagnantMonths=0;
        ch._stagnationWindowStart=ch.members;
        ch._stagnationMonths=0;
        ch.failedEvangelismAttempts=0;
        const d=n/ch.members;
        ch.offerRate=Math.max(0.15,Math.min(1,ch.offerRate*(1-d*0.25)+0.02));
        closeDecisionModal('Campanha bem-sucedida: +'+n+' membros. Taxa de oferta: '+Math.round(ch.offerRate*100)+'%.');
      }else{
        ch.failedEvangelismAttempts=(ch.failedEvangelismAttempts||0)+1;
        if(ch.failedEvangelismAttempts>=3&&totalChurches('IELB')>1){
          const city=ch.city||STATES[item.stateId].name;
          closeChurch(item.stateId,item.index);
          closeDecisionModal('Depois de três campanhas sem fruto, a direção decidiu encerrar o ponto em '+city+'.','bad');
        }else{
          closeDecisionModal('A campanha não surtiu efeito suficiente. Tentativas sem fruto: '+(ch.failedEvangelismAttempts||0)+'/3.','bad');
        }
      }
    };mc.appendChild(evang);
  }else{
    const stewardship=document.createElement('button');stewardship.className='mcbtn';stewardship.textContent='Anúncio de mordomia cristã (20 Fé | 60% de chance)';stewardship.disabled=G.fe<20;stewardship.onclick=()=>{
      G.fe-=20;
      if(Math.random()<0.6){
        const gain=0.08+Math.random()*0.1;
        ch.offerRate=Math.max(0.15,Math.min(1,(ch.offerRate||0.7)+gain));
        ch.struggleMonths=Math.max(0,(ch.struggleMonths||0)-4);
        ch.solventMonths=0;
        ch.failedStewardshipAttempts=0;
        closeDecisionModal('O anúncio de mordomia cristã fortaleceu o compromisso da comunidade. Taxa de oferta: '+Math.round(ch.offerRate*100)+'%.');
      }else{
        ch.failedStewardshipAttempts=(ch.failedStewardshipAttempts||0)+1;
        ch.struggleMonths=(ch.struggleMonths||0)+1;
        if(ch.failedStewardshipAttempts>=2){
          showDeficitFinalChoice(item,kind);
        }else{
          closeDecisionModal('O apelo de mordomia cristã ainda não mudou o caixa da missão. Tentativas sem efeito: '+ch.failedStewardshipAttempts+'/2.','bad');
        }
      }
    };mc.appendChild(stewardship);
  }
  if(stagnant){const skip=document.createElement('button');skip.className='mcbtn';skip.textContent='Pular por enquanto';skip.onclick=()=>{closeDecisionModal('A decisão foi adiada. Se não houver crescimento, ela voltará no próximo relatório anual.','bad');};mc.appendChild(skip);}
  const totalIelb=totalChurches('IELB');
  if(stagnant&&totalIelb>1){const close=document.createElement('button');close.className='mcbtn';close.textContent='Encerrar este ponto';close.onclick=()=>{closeChurch(item.stateId,item.index);closeDecisionModal('O ponto foi encerrado. O pastor voltou a ficar disponível.','bad');};mc.appendChild(close);}
  modal.classList.add('show');
}
function showDeficitFinalChoice(item,kind){
  const ch=item.ch;
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  const result=document.createElement('div');
  result.className='event-result bad';
  result.textContent='A mordomia cristã foi anunciada duas vezes sem mudar o caixa. Agora a IELB precisa subsidiar esta '+kind+' ou encerrar o ponto.';
  mc.appendChild(result);
  const sub=document.createElement('button');
  sub.className='mcbtn';
  sub.textContent='Pedir subsídio direto à IELB por 5 anos';
  sub.onclick=()=>{
    ch.subsidized=true;
    ch.subsidyMonths=0;
    ch.solventMonths=0;
    ch.failedStewardshipAttempts=0;
    closeDecisionModal('A IELB subsidiará esta '+kind+' por 5 anos. Depois disso haverá revisão.');
  };
  mc.appendChild(sub);
  if(totalChurches('IELB')>1){
    const close=document.createElement('button');
    close.className='mcbtn';
    close.textContent='Encerrar este ponto de missão';
    close.onclick=()=>{
      const city=ch.city||STATES[item.stateId].name;
      closeChurch(item.stateId,item.index);
      closeDecisionModal('O ponto em '+city+' foi encerrado após duas tentativas de mordomia cristã sem efeito.','bad');
    };
    mc.appendChild(close);
  }
}
function closeDecisionModal(msg,type='good'){
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  const result=document.createElement('div');result.className='event-result '+(type==='bad'?'bad':'good');result.textContent=msg;mc.appendChild(result);
  const btn=document.createElement('button');btn.className='mcbtn';btn.textContent='Continuar';btn.onclick=()=>{document.getElementById('modal').classList.remove('show');G.paused=false;document.getElementById('pausebtn').textContent='⏸ Pausar';recalc();renderLeft();renderRight();redrawDots();updateRes();processEventQueue();};mc.appendChild(btn);
  recalc();updateRes();renderLeft();renderRight();redrawDots();
}
function closeChurch(stateId,index){
  const slot=G.states[stateId].denomData.IELB;
  const ch=slot.churches[index];
  G.pastors.forEach(p=>{
    if(p.assignedStateId!==stateId)return;
    if(p.assignedChurchIndex===index)releasePastor(p);
    else if(pastorRouteIndexes(p).includes(index))removePastorRoute(p,index);
  });
  slot.churches.splice(index,1);
  G.pastors.forEach(p=>{
    if(p.assignedStateId===stateId){
      if(p.assignedChurchIndex>index)p.assignedChurchIndex--;
      setPastorRoutes(p,pastorRouteIndexes(p).map(i=>i>index?i-1:i));
    }
  });
  syncDenomMembers(stateId,'IELB');
}

function showEvent(ev){
  G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent=ev.tag;tag.className=ev.type==='good'?'good':ev.type==='doctrine'?'doctrine':ev.type==='warn'?'warn':'bad';
  document.getElementById('m-title').textContent=ev.title;document.getElementById('m-yr').textContent=ev.yr||'';document.getElementById('m-txt').textContent=ev.txt;
  const ref=document.getElementById('m-ref');
  if(ev.pastorRoster){
    const names=G.pastors.filter(p=>p.graduationYear===ev.year).map(p=>p.name);
    ref.style.display='block';
    ref.innerHTML='<strong>Se formaram os pastores:</strong><div class="pastor-list">'+(names.length?names.map(n=>'<div class="pastor-name">'+n+'</div>').join(''):'<div class="pastor-name">A lista serÃ¡ registrada na formatura anual.</div>')+'</div>';
  }else if(ev.ref){ref.textContent=ev.ref;ref.style.display='block';}else ref.style.display='none';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  ev.choices.forEach(ch=>{const b=document.createElement('button');b.className='mcbtn';b.textContent=ch.label;b.onclick=()=>resolveChoice(ev,ch);mc.appendChild(b);});
  modal.classList.add('show');
}

function resolveChoice(ev,ch){
  const mc=document.getElementById('m-choices');
  [...mc.querySelectorAll('.mcbtn')].forEach(b=>b.disabled=true);
  ch.effect();G.doc=Math.max(0,Math.min(100,G.doc));
  const result=document.createElement('div');result.className='event-result '+(ch.correct===false?'bad':'good');
  const prefix=ch.correct===true?'Decisão confessional correta. ':ch.correct===false?'Decisão problemática. ':'';
  result.textContent=prefix+(ch.result||'Consequência aplicada ao jogo.');
  mc.appendChild(result);
  const cont=document.createElement('button');cont.className='mcbtn';cont.textContent='Continuar';cont.onclick=resumeFromEvent;mc.appendChild(cont);
  recalc();updateRes();renderLeft();renderRight();redrawDots();
}

function resumeFromEvent(){document.getElementById('modal').classList.remove('show');G.paused=false;document.getElementById('pausebtn').textContent='⏸ Pausar';processEventQueue();}

function updateRes(){
  document.getElementById('r-fe').textContent=Math.floor(G.fe);document.getElementById('r-of').textContent=Math.floor(G.of);document.getElementById('r-fi').textContent=Math.floor(G.fi);
  const rrFe=document.getElementById('rr-fe'), rrOf=document.getElementById('rr-of'), rrFi=document.getElementById('rr-fi');
  rrFe.textContent=fmtRate(G.rateFe,2)+'/mês';rrOf.textContent=fmtRate(G.rateOf,2)+'/mês';rrFi.textContent=fmtRate(G.rateFi,2)+'/mês';
  rrFe.style.color=G.rateFe<0?'#c62828':'#2a7a2a';rrOf.style.color=G.rateOf<0?'#c62828':'#2a7a2a';rrFi.style.color=G.rateFi<0?'#c62828':'#2a7a2a';
  G.doc=Math.max(0,Math.min(100,G.doc));document.getElementById('doc-fill').style.width=G.doc+'%';document.getElementById('doc-pct').textContent=Math.floor(G.doc)+'%';
  document.getElementById('datebox').textContent=MONTHS[G.month]+' '+G.year;document.getElementById('yeardisp').textContent=G.year;
  const bc=document.getElementById('btn-cat-r');if(bc)bc.disabled=G.paused||G.fe<25;
  const qc=document.querySelector('#quick-actions button:nth-child(2)');if(qc)qc.disabled=G.paused||G.fe<25;
  const qcult=document.querySelector('#quick-actions button:first-child');if(qcult)qcult.disabled=G.paused;
}
function fmtRate(v,digits){return (v>=0?'+':'')+v.toFixed(digits);}
function setTick(m){document.getElementById('ticker').textContent=m;}

let lastT=performance.now(),monthMs=0,tickMs=0;
const MONTH_SECS=3;

function loop(now){
  if(!G.paused){
    const dt=Math.min((now-lastT)/1000,0.15)*G.speed;
    G.fe=Math.min(G.fe+G.rateFe*dt,9999);G.of=Math.min(G.of+G.rateOf*dt,9999);
    const memberGain=G.rateFi*dt;
    G.fi=Math.max(0,Math.min(G.fi+memberGain,9999));
    applyOrganicMemberGrowth(dt);
    let rd=false;
    ALL_STATES.forEach(id=>{
      const st=G.states[id];
      if(st.missionary){
        st.missionProg+=dt*(100/(MONTH_SECS*MISSION_MONTHS));
        if(st.missionProg>=100){st.missionary=false;st.missionProg=0;const ch=addChurch(id,'IELB',12,1,G.year,'missao');const p=getPastor(st.missionPastorId);assignPastorToChurch(p,id,G.states[id].denomData.IELB.churches.indexOf(ch));st.missionPastorId=null;rd=true;setTick('Missão IELB aberta em '+ch.city+', '+STATES[id].name+'!');}
      }
    });
    monthMs+=dt;
    if(monthMs>=MONTH_SECS){
      monthMs=0;G.month=(G.month+1)%12;if(G.month===0){G.year++;processAnnualYear();}
      ALL_STATES.forEach(id=>DENOM_KEYS.forEach(d=>{const slot=G.states[id].denomData[d];if(slot.cooldown>0)slot.cooldown--;}));
      ensureScheduledFoundations();
      processPlayerMonthlyChurches();
      monthlyRivalOrganicGrowth();
      const key=G.year+'-'+(G.month+1), ev=EVENTS.find(e=>e.year===G.year&&e.month===G.month+1);
      if(ev&&!G.lastEv.has(key)){G.lastEv.add(key);showEvent(ev);}
      const rk=G.year+'-'+G.month;if(G.lastRivalTurn!==rk){G.lastRivalTurn=rk;rivalStrategicTurn();}
      recalc();applyMonthlySustainability();checkCampaignGoal();buildLegend();rd=true;
    }
    if(rd){redrawDots();renderLeft();renderRight();}
    tickMs+=dt;if(tickMs>=10){tickMs=0;G.tickIdx=(G.tickIdx+1)%TICKERS.length;setTick(TICKERS[G.tickIdx]);}
    updateRes();
  }
  lastT=now;requestAnimationFrame(loop);
}

async function startClientGame(){
  initGame();
  if(window.CultivandoPersistence) await window.CultivandoPersistence.loadInto(G);
  bindMap();recalc();updateRes();buildLegend();redrawDots();selectBrazilOverview();setMobilePanel('info');
  if(window.CultivandoPersistence) window.CultivandoPersistence.start(G);
  requestAnimationFrame(t=>{lastT=t;loop(t);});
}
startClientGame();

function preventPageZoom(){
  document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
}
preventPageZoom();
