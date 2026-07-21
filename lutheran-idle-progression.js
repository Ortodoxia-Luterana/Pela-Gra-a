const STAGES = Object.freeze([
  { id: 1, name: 'Sala emprestada', requirement: null, reward: null },
  { id: 2, name: 'Capela simples', requirement: { level: 3, members: 0, stationLevels: 6, offerings: 500 }, reward: { gems: 2, materials: 4 } },
  { id: 3, name: 'Igreja de madeira', requirement: { level: 8, members: 25, stationLevels: 18, offerings: 5_000 }, reward: { gems: 3, materials: 10 } },
  { id: 4, name: 'Templo de alvenaria', requirement: { level: 15, members: 150, stationLevels: 40, offerings: 50_000 }, reward: { gems: 5, materials: 25 } },
  { id: 5, name: 'Complexo paroquial', requirement: { level: 25, members: 800, stationLevels: 75, offerings: 500_000 }, reward: { gems: 8, materials: 60 } },
  { id: 6, name: 'Centro comunitário', requirement: { level: 40, members: 3_500, stationLevels: 120, offerings: 5_000_000 }, reward: { gems: 12, materials: 140 } },
  { id: 7, name: 'Rede de missões', requirement: { level: 60, members: 15_000, stationLevels: 180, offerings: 50_000_000 }, reward: { gems: 18, materials: 320 } },
  { id: 8, name: 'Sede distrital', requirement: { level: 85, members: 100_000, stationLevels: 270, offerings: 2_000_000_000 }, reward: { gems: 30, materials: 750 } }
]);

function clampStage(value) {
  return Math.max(1, Math.min(STAGES.length, Math.floor(Number(value) || 1)));
}

function stageLevelCap(stage) {
  return Math.min(50, 4 + clampStage(stage) * 6);
}

function offlineHourCap(stage) {
  return Math.min(12, 3 + clampStage(stage));
}

function utcDayKey(now = new Date()) {
  return new Date(now).toISOString().slice(0, 10);
}

function utcWeekKey(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function daysBetween(left, right) {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  return Math.round((Date.parse(`${right}T00:00:00Z`) - Date.parse(`${left}T00:00:00Z`)) / 86_400_000);
}

function checkinReward(day) {
  const normalized = Math.max(1, Math.min(28, Number(day) || 1));
  const milestone = normalized % 7 === 0;
  return {
    offerings: milestone ? normalized * 1_500 : normalized * 180,
    gems: milestone ? Math.ceil(normalized / 7) + 1 : 0,
    materials: milestone ? normalized * 2 : Math.floor(normalized / 4)
  };
}

function dailyMissionDefinitions(stage, progress = {}) {
  const currentStage = clampStage(stage);
  return [
    { id: 'collect', label: 'Serviço constante', current: Number(progress.collect_count || 0), goal: 4 + currentStage * 2, reward: { offerings: 180 * currentStage, materials: currentStage } },
    { id: 'upgrade', label: 'Cuidar da estrutura', current: Number(progress.upgrade_count || 0), goal: 1 + Math.floor(currentStage / 2), reward: { offerings: 260 * currentStage, materials: currentStage * 2 } },
    { id: 'members', label: 'Acolher novos membros', current: Number(progress.members_gained || 0), goal: 2 + currentStage * 3, reward: { offerings: 320 * currentStage, gems: currentStage >= 4 ? 1 : 0 } }
  ];
}

function progressionSnapshot(profile, stationRows) {
  const stage = clampStage(profile.stage);
  const current = STAGES[stage - 1];
  const next = STAGES[stage] || null;
  const stationLevels = stationRows.reduce((sum, row) => sum + (row.built ? Number(row.level) : 0), 0);
  if (!next) return { current, next: null, stationLevels, levelCap: stageLevelCap(stage), offlineHours: offlineHourCap(stage) };
  const requirement = next.requirement;
  const requirements = [
    { id: 'level', label: 'Nível da congregação', current: Number(profile.level), goal: requirement.level },
    { id: 'members', label: 'Membros', current: Number(profile.members), goal: requirement.members },
    { id: 'stationLevels', label: 'Níveis de estações', current: stationLevels, goal: requirement.stationLevels },
    { id: 'offerings', label: 'Ofertas para expansão', current: Number(profile.offerings), goal: requirement.offerings }
  ];
  return {
    current,
    next: { ...next, ready: requirements.every(item => item.current >= item.goal), requirements },
    stationLevels,
    levelCap: stageLevelCap(stage),
    offlineHours: offlineHourCap(stage)
  };
}

module.exports = {
  STAGES,
  checkinReward,
  clampStage,
  dailyMissionDefinitions,
  daysBetween,
  offlineHourCap,
  progressionSnapshot,
  stageLevelCap,
  utcDayKey,
  utcWeekKey
};
