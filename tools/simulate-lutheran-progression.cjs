const { STAGES, checkinReward, dailyMissionDefinitions, offlineHourCap, stageLevelCap } = require('../lutheran-idle-progression');

const stationDefs = {
  entrance: { base: 90, output: 0 },
  benches: { base: 100, output: 0 },
  pulpit: { base: 75, output: 34 },
  altar: { base: 110, output: 0 },
  reception: { base: 120, output: 2 },
  catechesis: { base: 260, output: 1 }
};

const levels = { entrance: 1, benches: 1, pulpit: 1, altar: 1, reception: 0, catechesis: 0 };
let offerings = 200;
let members = 0;
let xp = 0;
let stage = 1;
const reached = [{ stage: 1, day: 0, name: STAGES[0].name }];

const upgradeCost = (id, level) => Math.ceil(stationDefs[id].base * Math.pow(1.32, Math.max(0, level - 1)) / 5) * 5;
const totalLevels = () => Object.values(levels).reduce((sum, level) => sum + level, 0);
const profileLevel = () => Math.min(100, 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 120)));

function dailyProduction() {
  const stageBonus = 1 + (stage - 1) * 0.2;
  const altarBonus = 1 + (levels.altar - 1) * 0.04;
  const levelBonus = id => Math.pow(1.18, Math.max(0, levels[id] - 1));
  const pulpitCycles = 50;
  const receptionCycles = levels.reception ? 33 : 0;
  const catechesisCycles = levels.catechesis ? 18 : 0;
  const activeOfferings = Math.floor(34 * pulpitCycles * levelBonus('pulpit') * 1.18 * stageBonus * altarBonus)
    + Math.floor(receptionCycles * 5 * levelBonus('reception') * altarBonus)
    + Math.floor(catechesisCycles * 8 * levelBonus('catechesis') * altarBonus);
  const activeMembers = Math.floor(catechesisCycles * Math.pow(1.14, Math.max(0, levels.catechesis - 1)) * stageBonus);
  const offlineSeconds = offlineHourCap(stage) * 3600;
  const offlineOfferings = Math.floor(offlineSeconds / 60 * Math.pow(1.12, levels.pulpit - 1) * altarBonus * 1.5 * (1 + (stage - 1) * 0.22));
  const offlineMembers = levels.catechesis ? Math.floor(offlineSeconds / 1800 * Math.pow(1.12, levels.catechesis - 1) * (1 + (stage - 1) * 0.22)) : 0;
  offerings += activeOfferings + offlineOfferings;
  members += activeMembers + offlineMembers;
  xp += (pulpitCycles + receptionCycles + catechesisCycles) * 4 + activeMembers * 6;
}

function retentionRewards(day) {
  const checkin = checkinReward((day - 1) % 28 + 1);
  offerings += checkin.offerings;
  const daily = dailyMissionDefinitions(stage, { collect_count: 99, upgrade_count: 99, members_gained: 99 });
  offerings += daily.reduce((sum, mission) => sum + Number(mission.reward.offerings || 0), 0);
  if (day % 7 === 0) offerings += 250 * stage * 4;
}

function buyProgression() {
  if (!levels.reception && offerings >= 160) { offerings -= 160; levels.reception = 1; }
  if (stage >= 2 && !levels.catechesis && offerings >= 420) { offerings -= 420; levels.catechesis = 1; }
  const next = STAGES[stage];
  if (!next) return;
  const req = next.requirement;
  while (totalLevels() < req.stationLevels) {
    const choices = Object.keys(levels)
      .filter(id => levels[id] > 0 && levels[id] < stageLevelCap(stage))
      .map(id => ({ id, cost: upgradeCost(id, levels[id]) }))
      .sort((a, b) => a.cost - b.cost);
    if (!choices.length || choices[0].cost > offerings) break;
    offerings -= choices[0].cost;
    levels[choices[0].id] += 1;
  }
  if (profileLevel() >= req.level && members >= req.members && totalLevels() >= req.stationLevels && offerings >= req.offerings) {
    offerings -= req.offerings;
    xp += stage * 220;
    stage += 1;
  }
}

for (let day = 1; day <= 365; day += 1) {
  dailyProduction();
  retentionRewards(day);
  buyProgression();
  if (!reached.some(item => item.stage === stage)) reached.push({ stage, day, name: STAGES[stage - 1].name });
}

const result = {
  assumptions: 'Duas sessões ativas de 5 minutos por dia, coleta das missões diárias, check-in e produção offline no limite do estágio.',
  reached,
  after365Days: { stage, name: STAGES[stage - 1].name, level: profileLevel(), members: Math.floor(members), stationLevels: totalLevels(), offerings: Math.floor(offerings) }
};

console.log(JSON.stringify(result, null, 2));

if (reached.length !== 8) process.exitCode = 1;
if (reached.at(-1).day < 90) {
  console.error('Curva curta demais: o estágio final foi alcançado antes de 90 dias.');
  process.exitCode = 1;
}
if (reached.at(-1).day > 365) {
  console.error('Curva longa demais: o estágio final não foi alcançado em até 365 dias.');
  process.exitCode = 1;
}
