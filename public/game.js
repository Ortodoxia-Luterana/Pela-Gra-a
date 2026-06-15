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
const REGION_STATES={
  norte:['AC','AP','AM','PA','RO','RR','TO'],
  nordeste:['AL','BA','CE','MA','PB','PE','PI','RN','SE'],
  sudeste:['ES','MG','RJ','SP'],
  sul:['PR','RS','SC'],
  centroOeste:['DF','GO','MT','MS']
};

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
const PLAYER_EXPANSION_COST=60;
const SEMINARY_MONTHLY_COST=0.5;
const SEMINARY_SUBSIDY_PER_STUDENT=0.15;
const SEMINARY_YEARS=7;
const CHURCH_SUBSIDY_MONTHS=60;
const ANNUAL_BATCH_THRESHOLD=5;
const PASTOR_MEMBER_CAPACITY=300;
const CHURCH_MEMBER_CAPACITY=PASTOR_MEMBER_CAPACITY*2;

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

const G={year:1904,month:0,paused:true,started:false,gameOver:false,monthlyExpense:0,speed:1,fe:20,of:5,fi:12,doc:70,doctrineCorrectCount:0,doctrineWrongCount:0,rateMult:1,rateFe:0.35,rateOf:0.08,rateFi:0.01,sel:'BR',lastEv:new Set(),tickIdx:0,lastRivalTurn:'',states:{},foundedDenoms:new Set(),seminaryOpen:false,seminaryMode:'strong',seminary:[],pastors:[],availablePastors:[],nextPastorId:1,totalPastorsFormed:0,annualDecisions:[],eventQueue:[],usedTheologyQuestions:[],achievements:[],offerBrokeMonths:0,mods:{doctrineGrowth:1,missionGrowth:1,youthRetention:1,persecutionPressure:1,pastoralFormation:1}};

const ACHIEVEMENTS=[
  {id:'primeiros-passos',title:'Primeiros Passos',xp:75,points:25,icon:'/assets/achievements/primeiros-passos.png',desc:'Voce iniciou sua primeira campanha em Pela Graca 1904.'},
  {id:'primeira-missao',title:'Primeira Missao',xp:120,points:40,icon:'/assets/achievements/primeira-missao.png',desc:'Voce abriu seu primeiro ponto de missao IELB.'},
  {id:'rumo-alem-do-sul',title:'Rumo Alem do Sul',xp:180,points:55,icon:'/assets/achievements/rumo-alem-do-sul.png',desc:'Voce levou a IELB para fora do Rio Grande do Sul.'},
  {id:'dino-luterano',title:'Dino Luterano',xp:500,points:160,icon:'/assets/achievements/dino-luterano.png',desc:'Voce criou uma igreja ou missao IELB no Acre.'},
  {id:'primeiros-pastores',title:'Primeiros Pastores',xp:220,points:70,icon:'/assets/achievements/primeiros-pastores.png',desc:'Os primeiros pastores foram formados no Seminario Concordia.'},
  {id:'catequista-atento',title:'Catequista Atento',xp:180,points:60,icon:'/assets/achievements/catequista-atento.png',desc:'Voce acertou 10 perguntas doutrinarias.'},
  {id:'doutor-da-doutrina',title:'Doutor da Doutrina',xp:320,points:100,icon:'/assets/achievements/doutor-da-doutrina.png',desc:'Voce acertou 20 perguntas doutrinarias.'},
  {id:'dez-igrejas',title:'Dez Igrejas',xp:300,points:90,icon:'/assets/achievements/dez-igrejas.png',desc:'A IELB chegou a 10 igrejas e missoes.'},
  {id:'centesima-igreja',title:'Centesima Igreja',xp:500,points:150,icon:'/assets/achievements/centesima-igreja.png',desc:'A IELB chegou a 100 igrejas na campanha.'},
  {id:'cem-membros',title:'Cem Membros',xp:220,points:70,icon:'/assets/achievements/cem-membros.png',desc:'A IELB chegou a 100 membros.'},
  {id:'mil-membros',title:'Mil Membros',xp:650,points:210,icon:'/assets/achievements/mil-membros.png',desc:'A IELB chegou a 1000 membros.'},
  {id:'cem-pastores',title:'Cem Pastores',xp:750,points:240,icon:'/assets/achievements/cem-pastores.png',desc:'A campanha formou 100 pastores ao todo.'},
  {id:'brasil-ielb',title:'Brasil de Norte a Sul',xp:900,points:300,icon:'/assets/achievements/brasil-ielb.png',desc:'A IELB chegou a todos os estados do Brasil.'},
  {id:'centenario-ielb',title:'Centenario IELB',xp:900,points:300,icon:'/assets/achievements/centenario-ielb.png',desc:'Voce conduziu a IELB por 100 anos de historia.'},
  {id:'ate-aqui-nos-ajudou',title:'Ate Aqui nos Ajudou',xp:1200,points:400,icon:'/assets/achievements/ate-aqui-nos-ajudou.png',desc:'Voce chegou ao ano final da campanha, 2026.'},
  {id:'missionario-do-sertao',title:'Missionario do Sertao',xp:850,points:275,icon:'/assets/achievements/missionario-do-sertao.png',desc:'O Nordeste terminou como a regiao com mais igrejas IELB.'},
  {id:'tribo-luterana',title:'Tribo Luterana',xp:850,points:275,icon:'/assets/achievements/tribo-luterana.png',desc:'O Norte terminou como a regiao com mais igrejas IELB.'},
  {id:'culto-gauchesco',title:'Culto Gauchesco',xp:700,points:225,icon:'/assets/achievements/culto-gauchesco.png',desc:'A campanha chegou a 2026 com igrejas IELB somente no Rio Grande do Sul.'},
  {id:'xique-xique-e-de-jesus',title:'Xique-Xique e de Jesus',xp:1000,points:350,icon:'/assets/achievements/xique-xique-e-de-jesus.png',desc:'Xique-Xique, na Bahia, terminou como a cidade com mais igrejas IELB.'},
  {id:'igreja-urbana',title:'Igreja Urbana',xp:800,points:250,icon:'/assets/achievements/igreja-urbana.png',desc:'Mais da metade das igrejas IELB ficaram no estado de Sao Paulo.'}
];

function achievementUnlocked(id){
  return Array.isArray(G.achievements)&&G.achievements.some(a=>a.id===id);
}
function unlockAchievement(id){
  if(!Array.isArray(G.achievements))G.achievements=[];
  if(achievementUnlocked(id))return false;
  const def=ACHIEVEMENTS.find(a=>a.id===id);
  if(!def)return false;
  const item={id:def.id,title:def.title,xp:def.xp,points:def.points,unlockedAt:new Date().toISOString()};
  G.achievements.push(item);
  showAchievementToast(def);
  setTick('Conquista desbloqueada: '+def.title+' (+'+def.xp+' XP, +'+def.points+' pontos).');
  if(window.CultivandoPersistence)window.CultivandoPersistence.save(G);
  return true;
}
function checkAchievements(){
  if(!G.started)return;
  unlockAchievement('primeiros-passos');
  if(ielbMissionCount()>=1)unlockAchievement('primeira-missao');
  if(ALL_STATES.some(id=>id!=='RS'&&churchCount(id,'IELB')>0))unlockAchievement('rumo-alem-do-sul');
  if(churchCount('AC','IELB')>0)unlockAchievement('dino-luterano');
  if(formedPastorCount()>=1)unlockAchievement('primeiros-pastores');
  if((G.doctrineCorrectCount||0)>=10)unlockAchievement('catequista-atento');
  if((G.doctrineCorrectCount||0)>=20)unlockAchievement('doutor-da-doutrina');
  if(totalChurches('IELB')>=10)unlockAchievement('dez-igrejas');
  if(totalChurches('IELB')>=100)unlockAchievement('centesima-igreja');
  if(totalMembers('IELB')>=100)unlockAchievement('cem-membros');
  if(totalMembers('IELB')>=1000)unlockAchievement('mil-membros');
  if(formedPastorCount()>=100)unlockAchievement('cem-pastores');
  if(ALL_STATES.every(id=>churchCount(id,'IELB')>0))unlockAchievement('brasil-ielb');
  if(G.year>=2004)unlockAchievement('centenario-ielb');
  if(G.year>=2026){
    unlockAchievement('ate-aqui-nos-ajudou');
    if(dominantRegion('nordeste'))unlockAchievement('missionario-do-sertao');
    if(dominantRegion('norte'))unlockAchievement('tribo-luterana');
    if(totalChurches('IELB')>0&&churchCount('RS','IELB')===totalChurches('IELB'))unlockAchievement('culto-gauchesco');
    if(dominantCity('BA','Xique-Xique'))unlockAchievement('xique-xique-e-de-jesus');
    if(totalChurches('IELB')>0&&churchCount('SP','IELB')>totalChurches('IELB')/2)unlockAchievement('igreja-urbana');
  }
}
function showAchievementToast(def){
  let wrap=document.getElementById('achievement-toast');
  if(!wrap){
    wrap=document.createElement('div');
    wrap.id='achievement-toast';
    wrap.setAttribute('role','status');
    document.body.appendChild(wrap);
  }
  wrap.innerHTML='<img src="'+def.icon+'" alt=""><div><strong>Conquista desbloqueada</strong><span>'+def.title+'</span><small>+'+def.xp+' XP · +'+def.points+' pontos</small></div>';
  wrap.classList.add('show');
  clearTimeout(showAchievementToast.timer);
  showAchievementToast.timer=setTimeout(()=>wrap.classList.remove('show'),5200);
}

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
  if(denom==='IELB')checkAchievements();
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
  if(ch.type==='congregacao'&&ch.members>=PASTOR_MEMBER_CAPACITY)return true;
  const p=pastorForChurch(stateId,index);
  return !!p&&pastorMemberLoad(p,stateId)>=PASTOR_MEMBER_CAPACITY&&isLargestPastorAssignment(stateId,index,p);
}
function churchInfluenceMult(stateId,index){
  if(!churchNeedsPastorRelief(stateId,index))return 1;
  const over=Math.max(0,churchPastorLoad(stateId,index)-PASTOR_MEMBER_CAPACITY);
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

function churchMemberLimit(ch){
  return ch&&ch.secondPastorId?CHURCH_MEMBER_CAPACITY:PASTOR_MEMBER_CAPACITY;
}
function churchAtMemberLimit(ch){
  return !!ch&&(ch.members||0)>=churchMemberLimit(ch)-0.001;
}
function addMembersToChurch(ch,amount){
  if(!ch||amount<=0)return 0;
  const limit=churchMemberLimit(ch);
  const before=ch.members||0;
  if(before>=limit)return 0;
  ch.members=Math.min(limit,before+amount);
  return ch.members-before;
}
function applyChurchCapacity(ch){
  if(!ch)return 0;
  const limit=churchMemberLimit(ch);
  if((ch.members||0)<=limit)return 0;
  const excess=ch.members-limit;
  const loss=Math.max(0.5,Math.min(12,excess*0.015));
  ch.members=Math.max(limit,ch.members-loss);
  return loss;
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

function statePopulationPeople(id){return Math.max(1,(STATE_POP[id]||100)*1000);}
function influencePercent(value){if(value>0&&value<0.01)return '<0,01%';if(value<1)return value.toFixed(2).replace('.',',')+'%';if(value<10)return value.toFixed(1).replace('.',',')+'%';return value.toFixed(0)+'%';}
function denomPopulationMembers(id,d){const slot=G.states[id].denomData[d];if(d!=='CAT')return Math.max(0,slot.members||0);const nonCath=DENOM_KEYS.filter(x=>x!=='CAT').reduce((sum,x)=>sum+Math.max(0,G.states[id].denomData[x].members||0),0);return Math.max(0,statePopulationPeople(id)-nonCath);}

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
  if((ch.members||0)>churchMemberLimit(ch))return -Math.max(0.2,Math.min(4,((ch.members||0)-churchMemberLimit(ch))*0.015));
  if(churchAtMemberLimit(ch)&&!churchNeedsPastorRelief(stateId,index))return 0;
  const overloadPenalty=churchNeedsPastorRelief(stateId,index)?(0.55+Math.min(0.3,overloadMembers/900)):1;
  const capSlow=ch.members>churchMemberLimit(ch)*0.82?Math.max(0.15,(churchMemberLimit(ch)-ch.members)/(churchMemberLimit(ch)*0.18)):1;
  const growth=(base+memberMomentum)*(0.55+health*0.28)*overloadPenalty*capSlow+(ch.organicBias||0)+(ch.organicPulse||0);
  if((ch.stagnantMonths||0)>=36)return Math.max(-0.22,growth-0.18);
  return Math.max(-0.18,Math.min(isMission?1.15:1.9,growth));
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
    const activeSub=G.seminary.filter(c=>G.year-c.entryYear<SEMINARY_YEARS).reduce((a,c)=>(a+(c.subsidyCount||0)),0);
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
      if(ch.type==='congregacao'&&ch.members>=PASTOR_MEMBER_CAPACITY&&!ch.secondPastorId&&ch.overloadSince===null){ch.overloadSince=G.year;setTick('A congregação em '+STATES[id].name+' tem '+Math.floor(ch.members)+' membros para 1 pastor.');if(G.started&&!G.paused)showSecondPastorModal(id,i,true);}
      if(ch.overloadSince!==null&&G.year-ch.overloadSince>=2&&ch.members>=PASTOR_MEMBER_CAPACITY-50&&!ch.secondPastorId)ch.members-=ch.members*0.015;
      applyChurchCapacity(ch);
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
    const deathChance=p.yearsOfMinistry>=25?0.014:p.yearsOfMinistry>=15?0.006:0.002;
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
      const supportBonus=Math.min(0.16,(c.subsidyCount||0)/Math.max(1,c.enrolled)*0.24);
      const r=(G.year<1930?randRange(0.45,0.62):G.year<1950?randRange(0.5,0.68):randRange(0.56,0.76))+supportBonus;
      const formed=Math.max(1,Math.min(c.enrolled,Math.round(c.enrolled*r)));
      entries+=formed;
      G.totalPastorsFormed=(G.totalPastorsFormed||0)+formed;
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
  compactAnnualNotifications();
  setTick(lines.join(' | '));
  if(G.eventQueue.length)processEventQueue();
  else if(G.annualDecisions.length)showChurchDecision(G.annualDecisions.shift());
}

function compactAnnualNotifications(){
  const totalPending=G.eventQueue.length+G.annualDecisions.length;
  if(totalPending<ANNUAL_BATCH_THRESHOLD)return;
  const queue=G.eventQueue.slice();
  const exits=queue.filter(ev=>ev.type==='pastorExit');
  const formations=queue.filter(ev=>ev.type==='formation');
  G.eventQueue=queue.filter(ev=>ev.type!=='pastorExit'&&ev.type!=='formation');
  if(formations.length>=2)G.eventQueue.unshift({type:'formationSummary',year:G.year,formations});
  else G.eventQueue.unshift(...formations);
  if(exits.length>=2)G.eventQueue.unshift({type:'pastorExitSummary',year:G.year,exits});
  else G.eventQueue.unshift(...exits);
  if(G.annualDecisions.length>=ANNUAL_BATCH_THRESHOLD){
    G.eventQueue.push({type:'annualBatch',year:G.year,decisions:G.annualDecisions});
    G.annualDecisions=[];
  }
}


function randRange(min,max){return min+Math.random()*(max-min);}
function seminaryEnrollmentForYear(year){
  const base=year<1930?randInt(3,5):year<1950?randInt(4,7):year<1980?randInt(6,10):randInt(8,14);
  return Math.max(1,Math.round(base*G.mods.pastoralFormation));
}
function formedPastorCount(){return G.totalPastorsFormed||0;}
function clearPastorFromChurches(p){
  if(!p)return;
  ALL_STATES.forEach(id=>{
    const churches=G.states[id].denomData.IELB.churches;
    churches.forEach(ch=>{if(ch.pastorId===p.id)ch.pastorId=null;if(ch.secondPastorId===p.id)ch.secondPastorId=null;});
  });
  removeAvailablePastor(p.id);
  p.assignedStateId=null;p.assignedChurchIndex=null;p.isOnRoute=false;p.routeChurchIndex=null;p.routeChurchIndexes=[];
}
function uncoveredChurches(){
  const arr=[];
  ALL_STATES.forEach(id=>G.states[id].denomData.IELB.churches.forEach((ch,i)=>{if(!pastorForChurch(id,i))arr.push({id,i,ch});}));
  return arr;
}
function churchesNeedingAnnualDecision(){
  const arr=[];
  ALL_STATES.forEach(id=>G.states[id].denomData.IELB.churches.forEach((ch,i)=>{
    if((ch.stagnantMonths||0)>=36)arr.push({type:'stagnant',id,i,ch});
    else if((ch.struggleMonths||0)>=12)arr.push({type:'financial',id,i,ch});
    if(ch.type==='missao'&&ch.members>=50)arr.push({type:'missionReady',id,i,ch});
    if(churchNeedsPastorRelief(id,i))arr.push({type:'overload',id,i,ch});
  }));
  return arr;
}
function showSecondPastorModal(id,i,urgent=false){
  const ch=G.states[id].denomData.IELB.churches[i];
  if(!ch)return;
  const wasPaused=G.paused;
  G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='PASTOR';tag.className='warn';
  document.getElementById('m-title').textContent='Igreja precisa de segundo pastor';
  document.getElementById('m-yr').textContent=(ch.city||STATES[id].name)+', '+STATES[id].name;
  document.getElementById('m-txt').textContent='Esta congregação tem muitos membros para apenas um pastor. Sem reforço, crescimento, ofertas e cuidado pastoral serão prejudicados.';
  const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Pastores disponíveis: '+G.availablePastors.length+' | Custo: '+PASTOR_SEND_COST+' Ofertas';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  const assign=document.createElement('button');assign.className='mcbtn';assign.textContent='Enviar segundo pastor';assign.disabled=!availablePastor()||G.of<PASTOR_SEND_COST;assign.onclick=()=>{assignAvailablePastorAction(id,i,true);closeMissionCityModal(wasPaused);};mc.appendChild(assign);
  const wait=document.createElement('button');wait.className='mcbtn';wait.textContent='Aguardar';wait.onclick=()=>closeMissionCityModal(wasPaused);mc.appendChild(wait);
  modal.classList.add('show');
}

function processEventQueue(){
  const ev=G.eventQueue.shift();
  if(!ev)return;
  if(ev.type==='pastorExit')return showPastorExitModal(ev);
  if(ev.type==='formation')return showFormationModal(ev);
  if(ev.type==='subsidy')return showSubsidyModal(ev);
  if(ev.type==='pastorExitSummary')return showPastorExitSummaryModal(ev);
  if(ev.type==='formationSummary')return showFormationSummaryModal(ev);
  if(ev.type==='annualBatch')return showAnnualBatchModal(ev);
}
function showPastorExitModal(ev){
  const wasPaused=G.paused;G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent=ev.kind==='death'?'LUTO':'EMÉRITO';tag.className=ev.kind==='death'?'bad':'warn';
  document.getElementById('m-title').textContent=ev.kind==='death'?'Falecimento de pastor':'Pastor emérito';
  document.getElementById('m-yr').textContent=String(ev.year);
  document.getElementById('m-txt').textContent=(ev.kind==='death'?'O pastor ':'O pastor ')+ev.name+(ev.kind==='death'?' faleceu':' tornou-se emérito')+' após '+ev.years+' anos de ministério. Campo: '+ev.stateName+'.';
  const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Pastores disponíveis agora: '+G.availablePastors.length+'.';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  const ok=document.createElement('button');ok.className='mcbtn';ok.textContent='Continuar';ok.onclick=()=>{closeMissionCityModal(wasPaused);if(G.eventQueue.length)processEventQueue();else if(G.annualDecisions.length)showChurchDecision(G.annualDecisions.shift());};mc.appendChild(ok);
  modal.classList.add('show');
}
function showPastorExitSummaryModal(ev){
  const wasPaused=G.paused;G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const deaths=ev.exits.filter(x=>x.kind==='death');
  const retires=ev.exits.filter(x=>x.kind==='retirement');
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='PASTORES';tag.className=deaths.length?'bad':'warn';
  document.getElementById('m-title').textContent='Saídas pastorais do ano';
  document.getElementById('m-yr').textContent=String(ev.year);
  document.getElementById('m-txt').textContent='Neste ano, '+ev.exits.length+' pastores deixaram campos por falecimento ou emerência. Isso pode gerar igrejas descobertas.';
  const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Falecimentos: '+deaths.length+' | Eméritos: '+retires.length+' | Pastores disponíveis: '+G.availablePastors.length;
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  ev.exits.slice(0,8).forEach(x=>{const d=document.createElement('div');d.className='srow';d.innerHTML='<span class="sl">'+x.name+'</span><span class="sv">'+(x.kind==='death'?'falecimento':'emérito')+'</span>';mc.appendChild(d);});
  const ok=document.createElement('button');ok.className='mcbtn';ok.textContent='Continuar';ok.onclick=()=>{closeMissionCityModal(wasPaused);if(G.eventQueue.length)processEventQueue();else if(G.annualDecisions.length)showChurchDecision(G.annualDecisions.shift());};mc.appendChild(ok);
  modal.classList.add('show');
}
function showFormationModal(ev){
  const wasPaused=G.paused;G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='SEMINÁRIO';tag.className='good';
  document.getElementById('m-title').textContent='Formatura pastoral';
  document.getElementById('m-yr').textContent='Turma '+ev.entryYear+' → '+ev.gradYear;
  document.getElementById('m-txt').textContent='Entraram '+ev.enrolled+' seminaristas; '+ev.formed+' foram formados e '+ev.left+' deixaram a turma durante o caminho.';
  const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Novos pastores: '+ev.names.join(', ')+'.';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  const ok=document.createElement('button');ok.className='mcbtn';ok.textContent='Receber pastores';ok.onclick=()=>{closeMissionCityModal(wasPaused);if(G.eventQueue.length)processEventQueue();else if(G.annualDecisions.length)showChurchDecision(G.annualDecisions.shift());};mc.appendChild(ok);
  modal.classList.add('show');
}
function showFormationSummaryModal(ev){
  const wasPaused=G.paused;G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const totalEnrolled=ev.formations.reduce((a,f)=>a+f.enrolled,0), totalFormed=ev.formations.reduce((a,f)=>a+f.formed,0), totalLeft=ev.formations.reduce((a,f)=>a+f.left,0);
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='SEMINÁRIO';tag.className='good';
  document.getElementById('m-title').textContent='Resumo das formaturas';
  document.getElementById('m-yr').textContent=String(ev.year);
  document.getElementById('m-txt').textContent='Várias turmas concluíram o ciclo: '+totalEnrolled+' entraram, '+totalFormed+' foram formados e '+totalLeft+' deixaram o caminho.';
  const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Pastores disponíveis agora: '+G.availablePastors.length+'.';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  ev.formations.slice(0,6).forEach(f=>{const d=document.createElement('div');d.className='srow';d.innerHTML='<span class="sl">Turma '+f.entryYear+'</span><span class="sv">'+f.formed+'/'+f.enrolled+' formados</span>';mc.appendChild(d);});
  const ok=document.createElement('button');ok.className='mcbtn';ok.textContent='Continuar';ok.onclick=()=>{closeMissionCityModal(wasPaused);if(G.eventQueue.length)processEventQueue();else if(G.annualDecisions.length)showChurchDecision(G.annualDecisions.shift());};mc.appendChild(ok);
  modal.classList.add('show');
}
function showSubsidyModal(ev){
  const wasPaused=G.paused;G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='SEMINÁRIO';tag.className='warn';
  document.getElementById('m-title').textContent='Pedido de auxílio a seminaristas';
  document.getElementById('m-yr').textContent=String(ev.year);
  document.getElementById('m-txt').textContent=ev.count+' seminarista(s) pedem auxílio mensal para permanecer no seminário. Sem apoio, parte da turma pode se perder.';
  const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Custo mensal: '+(ev.count*SEMINARY_SUBSIDY_PER_STUDENT).toFixed(2)+' Ofertas até a formatura.';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  const yes=document.createElement('button');yes.className='mcbtn';yes.textContent='Apoiar seminaristas';yes.onclick=()=>{ev.cohort.subsidyCount=(ev.cohort.subsidyCount||0)+ev.count;G.mods.pastoralFormation+=0.03;closeMissionCityModal(wasPaused);if(G.eventQueue.length)processEventQueue();else if(G.annualDecisions.length)showChurchDecision(G.annualDecisions.shift());};mc.appendChild(yes);
  const no=document.createElement('button');no.className='mcbtn';no.textContent='Não apoiar agora';no.onclick=()=>{ev.cohort.enrolled=Math.max(1,ev.cohort.enrolled-ev.count);closeMissionCityModal(wasPaused);if(G.eventQueue.length)processEventQueue();else if(G.annualDecisions.length)showChurchDecision(G.annualDecisions.shift());};mc.appendChild(no);
  modal.classList.add('show');
}
function showAnnualBatchModal(ev){
  const wasPaused=G.paused;G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const byType=ev.decisions.reduce((acc,d)=>{acc[d.type]=(acc[d.type]||0)+1;return acc;},{});
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.textContent='RELATÓRIO';tag.className='warn';
  document.getElementById('m-title').textContent='Muitas igrejas precisam de atenção';
  document.getElementById('m-yr').textContent=String(ev.year);
  document.getElementById('m-txt').textContent='Para não travar o jogo com dezenas de janelas, os casos do ano foram resumidos. As ações críticas continuam refletidas nos números das igrejas.';
  const ref=document.getElementById('m-ref');ref.style.display='block';ref.textContent='Estagnação: '+(byType.stagnant||0)+' | Finanças: '+(byType.financial||0)+' | Missões prontas: '+(byType.missionReady||0)+' | Sobrecarga pastoral: '+(byType.overload||0);
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  const ok=document.createElement('button');ok.className='mcbtn';ok.textContent='Entendi';ok.onclick=()=>{closeMissionCityModal(wasPaused);if(G.eventQueue.length)processEventQueue();};mc.appendChild(ok);
  modal.classList.add('show');
}
function showChurchDecision(dec){
  if(!dec)return;
  const wasPaused=G.paused;G.paused=true;document.getElementById('pausebtn').textContent='▶ Retomar';
  const {id,i,ch}=dec;
  const modal=document.getElementById('modal');
  const tag=document.getElementById('m-tag');tag.className='warn';
  const ref=document.getElementById('m-ref');ref.style.display='block';
  const mc=document.getElementById('m-choices');mc.innerHTML='';
  if(dec.type==='stagnant'){
    tag.textContent='ESTAGNAÇÃO';document.getElementById('m-title').textContent='Igreja estagnada';
    document.getElementById('m-yr').textContent=(ch.city||STATES[id].name)+', '+STATES[id].name;
    document.getElementById('m-txt').textContent='Esta comunidade não teve crescimento significativo por 3 anos. Você pode investir em evangelismo local.';
    ref.textContent='Custo: 30 Ofertas + 15 Fé.';
    const b=document.createElement('button');b.className='mcbtn';b.textContent='Investir em evangelismo local';b.disabled=G.of<30||G.fe<15;b.onclick=()=>{G.of-=30;G.fe-=15;const gained=randRange(6,14)*G.mods.missionGrowth;addMembersToChurch(ch,gained);ch.stagnantMonths=0;ch._stagnationWindowStart=ch.members;ch._stagnationMonths=0;closeMissionCityModal(wasPaused);afterDecisionQueue();};mc.appendChild(b);
  }else if(dec.type==='financial'){
    tag.textContent='FINANÇAS';document.getElementById('m-title').textContent='Igreja com dificuldade financeira';
    document.getElementById('m-yr').textContent=(ch.city||STATES[id].name)+', '+STATES[id].name;
    document.getElementById('m-txt').textContent='Esta congregação está com déficit por longo período. Você pode subsidiar por até 5 anos ou tentar catequese de mordomia.';
    ref.textContent='Subsídio cobre o déficit mensal. Mordomia custa 10 Fé.';
    const sub=document.createElement('button');sub.className='mcbtn';sub.textContent='Subsidiar igreja';sub.onclick=()=>{ch.subsidized=true;ch.subsidyMonths=0;ch.solventMonths=0;closeMissionCityModal(wasPaused);afterDecisionQueue();};mc.appendChild(sub);
    const mord=document.createElement('button');mord.className='mcbtn';mord.textContent='Catequese de mordomia';mord.disabled=G.fe<10;mord.onclick=()=>{G.fe-=10;ch.offerRate=Math.min(1,(ch.offerRate||0.7)+0.15);ch.failedStewardshipAttempts=(ch.failedStewardshipAttempts||0)+1;closeMissionCityModal(wasPaused);afterDecisionQueue();};mc.appendChild(mord);
  }else if(dec.type==='missionReady'){
    tag.textContent='MISSÃO';document.getElementById('m-title').textContent='Missão pronta para organização';
    document.getElementById('m-yr').textContent=(ch.city||STATES[id].name)+', '+STATES[id].name;
    document.getElementById('m-txt').textContent='Esta missão tem membros suficientes para se tornar congregação organizada.';
    ref.textContent='Custo: '+PLAYER_EXPANSION_COST+' Ofertas.';
    const org=document.createElement('button');org.className='mcbtn';org.textContent='Organizar como congregação';org.disabled=G.of<PLAYER_EXPANSION_COST;org.onclick=()=>promoteMissionToChurch(id,i,wasPaused);mc.appendChild(org);
  }else if(dec.type==='overload'){
    tag.textContent='PASTOR';document.getElementById('m-title').textContent='Sobrecarga pastoral';
    document.getElementById('m-yr').textContent=(ch.city||STATES[id].name)+', '+STATES[id].name;
    document.getElementById('m-txt').textContent='Um pastor está cuidando de muitos membros ou campos. Enviar reforço melhora cuidado, crescimento e ofertas.';
    ref.textContent='Custo: '+PASTOR_SEND_COST+' Ofertas. Pastores disponíveis: '+G.availablePastors.length;
    const b=document.createElement('button');b.className='mcbtn';b.textContent='Enviar pastor de reforço';b.disabled=!availablePastor()||G.of<PASTOR_SEND_COST;b.onclick=()=>{assignAvailablePastorAction(id,i,true);closeMissionCityModal(wasPaused);afterDecisionQueue();};mc.appendChild(b);
  }
  const skip=document.createElement('button');skip.className='mcbtn';skip.textContent='Aguardar';skip.onclick=()=>{closeMissionCityModal(wasPaused);afterDecisionQueue();};mc.appendChild(skip);
  modal.classList.add('show');
}
function afterDecisionQueue(){
  recalc();redrawDots();renderLeft();renderRight();updateRes();
  if(G.eventQueue.length)processEventQueue();
  else if(G.annualDecisions.length)showChurchDecision(G.annualDecisions.shift());
}

function tickMonth(){
  if(G.paused||G.gameOver)return;
  G.month++; if(G.month>=12){G.month=0;G.year++;ensureScheduledFoundations();processAnnualYear();}
  if(G.year>2026){endCampaign(true,'Campanha concluída até 2026.');return;}
  maybeTriggerEvent();progressMissionaries();rivalTurn();monthlyRivalOrganicGrowth();processPlayerMonthlyChurches();recalc();applyMonthlySustainability();checkAchievements();redrawDots();updateRes();renderLeft();renderRight();
  if(window.CultivandoPersistence)window.CultivandoPersistence.save(G);
}

function progressMissionaries(){
  ALL_STATES.forEach(id=>{
    const st=G.states[id];
    if(!st.missionary)return;
    const progress=(8+(st.modifiers.receptivity||1)*4)*G.mods.missionGrowth;
    st.missionProg+=progress;
    if(st.missionProg>=100){
      const p=getPastor(st.missionPastorId);
      const ch=addChurch(id,'IELB',10+Math.random()*8,1,G.year,'missao');
      const idx=st.denomData.IELB.churches.indexOf(ch);
      if(p&&p.alive&&!p.retired)assignPastorToChurch(p,id,idx);
      st.missionary=false;st.missionProg=0;st.missionPastorId=null;st.denomData.IELB.cooldown=PLAYER_PLANT_COOLDOWN;
      setTick('Missão organizada em '+STATES[id]... truncated