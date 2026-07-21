const crypto = require('node:crypto');
const {
  STAGES,
  checkinReward,
  dailyMissionDefinitions,
  daysBetween,
  progressionSnapshot,
  stageLevelCap,
  utcDayKey,
  utcWeekKey
} = require('./lutheran-idle-progression');

const STATIONS = Object.freeze({
  entrance: { title: 'Entrada', cycleSeconds: 10, baseOutput: 1, buildCost: 0, upgradeBase: 90, maxLevel: 50, unlockStage: 1 },
  benches: { title: 'Bancos', cycleSeconds: 0, baseOutput: 0, buildCost: 0, upgradeBase: 100, maxLevel: 50, unlockStage: 1 },
  pulpit: { title: 'Púlpito', cycleSeconds: 12, baseOutput: 34, buildCost: 0, upgradeBase: 75, maxLevel: 50, unlockStage: 1 },
  altar: { title: 'Altar', cycleSeconds: 0, baseOutput: 0, buildCost: 0, upgradeBase: 110, maxLevel: 50, unlockStage: 1 },
  reception: { title: 'Recepção', cycleSeconds: 18, baseOutput: 2, buildCost: 160, upgradeBase: 120, maxLevel: 50, unlockStage: 1 },
  catechesis: { title: 'Catequese', cycleSeconds: 32, baseOutput: 1, buildCost: 420, upgradeBase: 260, maxLevel: 50, unlockStage: 2 }
});

const INITIAL_STATIONS = [
  ['entrance', 1, 1, null],
  ['benches', 1, 1, null],
  ['pulpit', 1, 1, 'pastor-inicial'],
  ['altar', 1, 1, null],
  ['reception', 0, 0, null],
  ['catechesis', 0, 0, null]
];

function parseJson(value, fallback = null) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function clampInt(value, min, max) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;
}

function isoNow() { return new Date().toISOString(); }

function createLutheranIdleService({ db, gameId = 'lutheran-idle' }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lutheran_idle_profiles (
      user_id TEXT PRIMARY KEY,
      congregation_name TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      stage INTEGER NOT NULL DEFAULT 1,
      offerings INTEGER NOT NULL DEFAULT 200,
      gems INTEGER NOT NULL DEFAULT 5,
      materials INTEGER NOT NULL DEFAULT 0,
      reputation INTEGER NOT NULL DEFAULT 0,
      district_points INTEGER NOT NULL DEFAULT 0,
      visitors INTEGER NOT NULL DEFAULT 3,
      attendees INTEGER NOT NULL DEFAULT 0,
      catechumens INTEGER NOT NULL DEFAULT 0,
      members INTEGER NOT NULL DEFAULT 0,
      volunteers INTEGER NOT NULL DEFAULT 1,
      tutorial_step INTEGER NOT NULL DEFAULT 0,
      revision INTEGER NOT NULL DEFAULT 1,
      last_seen_at TEXT NOT NULL,
      offline_pending_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS lutheran_idle_stations (
      user_id TEXT NOT NULL,
      station_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      built INTEGER NOT NULL DEFAULT 0,
      active_worker_id TEXT,
      last_collected_at TEXT NOT NULL,
      PRIMARY KEY (user_id, station_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS lutheran_idle_workers (
      user_id TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      role TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      rarity TEXT NOT NULL DEFAULT 'comum',
      specialty TEXT NOT NULL,
      assigned_station TEXT,
      PRIMARY KEY (user_id, worker_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS lutheran_idle_action_receipts (
      user_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      action TEXT NOT NULL,
      response_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, idempotency_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS lutheran_idle_districts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      crest TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      project_goal INTEGER NOT NULL DEFAULT 5000,
      project_total INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS lutheran_idle_district_members (
      district_id TEXT NOT NULL,
      user_id TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'membro',
      contribution INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (district_id, user_id),
      FOREIGN KEY (district_id) REFERENCES lutheran_idle_districts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS lutheran_idle_daily_progress (
      user_id TEXT NOT NULL,
      day_key TEXT NOT NULL,
      collect_count INTEGER NOT NULL DEFAULT 0,
      upgrade_count INTEGER NOT NULL DEFAULT 0,
      members_gained INTEGER NOT NULL DEFAULT 0,
      claimed_json TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (user_id, day_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS lutheran_idle_retention (
      user_id TEXT PRIMARY KEY,
      checkin_day INTEGER NOT NULL DEFAULT 0,
      last_checkin_day TEXT,
      week_key TEXT NOT NULL,
      weekly_points INTEGER NOT NULL DEFAULT 0,
      weekly_claimed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS lutheran_idle_rank_idx ON lutheran_idle_profiles (stage DESC, members DESC, offerings DESC);
    CREATE INDEX IF NOT EXISTS lutheran_idle_district_rank_idx ON lutheran_idle_districts (project_total DESC);
  `);

  const q = {
    profile: db.prepare('SELECT * FROM lutheran_idle_profiles WHERE user_id = ?'),
    insertProfile: db.prepare(`INSERT INTO lutheran_idle_profiles (user_id, congregation_name, last_seen_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`),
    updateSeen: db.prepare('UPDATE lutheran_idle_profiles SET last_seen_at = ?, updated_at = ?, revision = revision + 1 WHERE user_id = ?'),
    setPending: db.prepare('UPDATE lutheran_idle_profiles SET offline_pending_json = ?, last_seen_at = ?, updated_at = ?, revision = revision + 1 WHERE user_id = ?'),
    clearPending: db.prepare('UPDATE lutheran_idle_profiles SET offerings = offerings + ?, members = members + ?, offline_pending_json = NULL, last_seen_at = ?, updated_at = ?, revision = revision + 1 WHERE user_id = ?'),
    stations: db.prepare('SELECT * FROM lutheran_idle_stations WHERE user_id = ? ORDER BY station_id'),
    station: db.prepare('SELECT * FROM lutheran_idle_stations WHERE user_id = ? AND station_id = ?'),
    insertStation: db.prepare('INSERT INTO lutheran_idle_stations (user_id, station_id, level, built, active_worker_id, last_collected_at) VALUES (?, ?, ?, ?, ?, ?)'),
    updateStationCollect: db.prepare('UPDATE lutheran_idle_stations SET last_collected_at = ? WHERE user_id = ? AND station_id = ?'),
    upgradeStation: db.prepare('UPDATE lutheran_idle_stations SET level = level + 1 WHERE user_id = ? AND station_id = ?'),
    buildStation: db.prepare('UPDATE lutheran_idle_stations SET built = 1, level = 1, last_collected_at = ? WHERE user_id = ? AND station_id = ?'),
    assignStation: db.prepare('UPDATE lutheran_idle_stations SET active_worker_id = ? WHERE user_id = ? AND station_id = ?'),
    workers: db.prepare('SELECT * FROM lutheran_idle_workers WHERE user_id = ? ORDER BY worker_id'),
    worker: db.prepare('SELECT * FROM lutheran_idle_workers WHERE user_id = ? AND worker_id = ?'),
    insertWorker: db.prepare('INSERT INTO lutheran_idle_workers (user_id, worker_id, role, level, rarity, specialty, assigned_station) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    clearWorkerAssignment: db.prepare('UPDATE lutheran_idle_workers SET assigned_station = NULL WHERE user_id = ? AND assigned_station = ?'),
    assignWorker: db.prepare('UPDATE lutheran_idle_workers SET assigned_station = ? WHERE user_id = ? AND worker_id = ?'),
    spendOfferings: db.prepare('UPDATE lutheran_idle_profiles SET offerings = offerings - ?, xp = xp + ?, last_seen_at = ?, updated_at = ?, revision = revision + 1 WHERE user_id = ? AND offerings >= ?'),
    addProduction: db.prepare('UPDATE lutheran_idle_profiles SET offerings = offerings + ?, visitors = visitors + ?, attendees = attendees + ?, members = members + ?, reputation = reputation + ?, xp = xp + ?, last_seen_at = ?, updated_at = ?, revision = revision + 1 WHERE user_id = ?'),
    updateLevel: db.prepare('UPDATE lutheran_idle_profiles SET level = ? WHERE user_id = ? AND level < ?'),
    tutorial: db.prepare('UPDATE lutheran_idle_profiles SET tutorial_step = max(tutorial_step, ?), updated_at = ? WHERE user_id = ?'),
    receipt: db.prepare('SELECT * FROM lutheran_idle_action_receipts WHERE user_id = ? AND idempotency_key = ?'),
    insertReceipt: db.prepare('INSERT INTO lutheran_idle_action_receipts (user_id, idempotency_key, action, response_json, created_at) VALUES (?, ?, ?, ?, ?)'),
    rankings: db.prepare(`SELECT p.congregation_name, p.level, p.stage, p.members, p.offerings, u.name AS player_name FROM lutheran_idle_profiles p JOIN users u ON u.id = p.user_id ORDER BY p.stage DESC, p.members DESC, p.level DESC, p.offerings DESC LIMIT 20`),
    districtMembership: db.prepare('SELECT m.*, d.name, d.crest, d.owner_id, d.project_goal, d.project_total FROM lutheran_idle_district_members m JOIN lutheran_idle_districts d ON d.id = m.district_id WHERE m.user_id = ?'),
    district: db.prepare('SELECT * FROM lutheran_idle_districts WHERE id = ?'),
    districtMembers: db.prepare('SELECT m.user_id, m.role, m.contribution, m.joined_at, u.name AS player_name FROM lutheran_idle_district_members m JOIN users u ON u.id = m.user_id WHERE m.district_id = ? ORDER BY m.contribution DESC, m.joined_at ASC'),
    openDistricts: db.prepare(`SELECT d.*, COUNT(m.user_id) AS member_count FROM lutheran_idle_districts d LEFT JOIN lutheran_idle_district_members m ON m.district_id = d.id GROUP BY d.id ORDER BY d.project_total DESC, d.created_at ASC LIMIT 12`),
    insertDistrict: db.prepare('INSERT INTO lutheran_idle_districts (id, name, crest, owner_id, project_goal, project_total, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)'),
    insertDistrictMember: db.prepare('INSERT INTO lutheran_idle_district_members (district_id, user_id, role, contribution, joined_at) VALUES (?, ?, ?, 0, ?)'),
    addContribution: db.prepare('UPDATE lutheran_idle_district_members SET contribution = contribution + ? WHERE district_id = ? AND user_id = ?'),
    addDistrictTotal: db.prepare('UPDATE lutheran_idle_districts SET project_total = project_total + ? WHERE id = ?'),
    spendContribution: db.prepare('UPDATE lutheran_idle_profiles SET offerings = offerings - ?, district_points = district_points + ?, last_seen_at = ?, updated_at = ?, revision = revision + 1 WHERE user_id = ? AND offerings >= ?'),
    spendStage: db.prepare('UPDATE lutheran_idle_profiles SET offerings = offerings - ?, stage = stage + 1, gems = gems + ?, materials = materials + ?, xp = xp + ?, last_seen_at = ?, updated_at = ?, revision = revision + 1 WHERE user_id = ? AND stage = ? AND offerings >= ?'),
    grantRewards: db.prepare('UPDATE lutheran_idle_profiles SET offerings = offerings + ?, gems = gems + ?, materials = materials + ?, xp = xp + ?, last_seen_at = ?, updated_at = ?, revision = revision + 1 WHERE user_id = ?'),
    daily: db.prepare('SELECT * FROM lutheran_idle_daily_progress WHERE user_id = ? AND day_key = ?'),
    insertDaily: db.prepare('INSERT OR IGNORE INTO lutheran_idle_daily_progress (user_id, day_key) VALUES (?, ?)'),
    addDailyCollect: db.prepare('UPDATE lutheran_idle_daily_progress SET collect_count = collect_count + ?, members_gained = members_gained + ? WHERE user_id = ? AND day_key = ?'),
    addDailyUpgrade: db.prepare('UPDATE lutheran_idle_daily_progress SET upgrade_count = upgrade_count + 1 WHERE user_id = ? AND day_key = ?'),
    setDailyClaims: db.prepare('UPDATE lutheran_idle_daily_progress SET claimed_json = ? WHERE user_id = ? AND day_key = ?'),
    retention: db.prepare('SELECT * FROM lutheran_idle_retention WHERE user_id = ?'),
    insertRetention: db.prepare('INSERT OR IGNORE INTO lutheran_idle_retention (user_id, week_key) VALUES (?, ?)'),
    resetWeekly: db.prepare('UPDATE lutheran_idle_retention SET week_key = ?, weekly_points = 0, weekly_claimed = 0 WHERE user_id = ?'),
    addWeeklyPoints: db.prepare('UPDATE lutheran_idle_retention SET weekly_points = weekly_points + ? WHERE user_id = ?'),
    setCheckin: db.prepare('UPDATE lutheran_idle_retention SET checkin_day = ?, last_checkin_day = ? WHERE user_id = ?'),
    claimWeekly: db.prepare('UPDATE lutheran_idle_retention SET weekly_claimed = 1 WHERE user_id = ?')
  };

  let namespace = null;
  const socketsByUser = new Map();

  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const value = fn();
      db.exec('COMMIT');
      return value;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function ensurePlayer(user) {
    if (!q.profile.get(user.id)) {
      transaction(() => {
        if (q.profile.get(user.id)) return;
        const now = isoNow();
        q.insertProfile.run(user.id, `Comunidade de ${user.name}`.slice(0, 52), now, now, now);
        for (const [stationId, level, built, worker] of INITIAL_STATIONS) {
          const collectedAt = stationId === 'pulpit' ? new Date(Date.now() - 14_000).toISOString() : now;
          q.insertStation.run(user.id, stationId, level, built, worker, collectedAt);
        }
        q.insertWorker.run(user.id, 'pastor-inicial', 'Pastor', 1, 'comum', 'culto', 'pulpit');
        q.insertWorker.run(user.id, 'voluntario-inicial', 'Voluntário', 1, 'comum', 'acolhimento', null);
      });
    }
    ensureRetention(user.id);
  }

  function ensureRetention(userId, now = new Date()) {
    const dayKey = utcDayKey(now);
    const weekKey = utcWeekKey(now);
    q.insertDaily.run(userId, dayKey);
    q.insertRetention.run(userId, weekKey);
    const retention = q.retention.get(userId);
    if (retention.week_key !== weekKey) q.resetWeekly.run(weekKey, userId);
    return { dayKey, weekKey };
  }

  function addActivity(userId, { collects = 0, upgrades = 0, members = 0, weeklyPoints = 0 } = {}) {
    const { dayKey } = ensureRetention(userId);
    if (collects || members) q.addDailyCollect.run(collects, members, userId, dayKey);
    for (let index = 0; index < upgrades; index += 1) q.addDailyUpgrade.run(userId, dayKey);
    if (weeklyPoints) q.addWeeklyPoints.run(weeklyPoints, userId);
  }

  function syncProfileLevel(userId) {
    const profile = q.profile.get(userId);
    const level = Math.min(100, 1 + Math.floor(Math.sqrt(Math.max(0, Number(profile.xp)) / 120)));
    q.updateLevel.run(level, userId, level);
  }

  function upgradeCost(stationId, level) {
    const definition = STATIONS[stationId];
    return Math.ceil((definition?.upgradeBase || 100) * Math.pow(1.32, Math.max(0, level - 1)) / 5) * 5;
  }

  function publicStation(row, stage, now = Date.now()) {
    const definition = STATIONS[row.station_id];
    const cycleSeconds = definition.cycleSeconds || 0;
    const elapsedMs = Math.max(0, now - Date.parse(row.last_collected_at));
    const levelCap = Math.min(definition.maxLevel, stageLevelCap(stage));
    const readyCycles = cycleSeconds ? Math.min(8 + Number(stage) * 4, Math.floor(elapsedMs / (cycleSeconds * 1000))) : 0;
    return {
      id: row.station_id,
      title: definition.title,
      level: Number(row.level),
      built: Boolean(row.built),
      activeWorkerId: row.active_worker_id || null,
      cycleSeconds,
      readyCycles,
      progress: cycleSeconds ? Math.min(1, (elapsedMs % (cycleSeconds * 1000)) / (cycleSeconds * 1000)) : 0,
      upgradeCost: Number(row.level) >= levelCap ? null : upgradeCost(row.station_id, Number(row.level)),
      buildCost: definition.buildCost,
      maxLevel: levelCap,
      absoluteMaxLevel: definition.maxLevel,
      unlockStage: definition.unlockStage,
      locked: Number(stage) < definition.unlockStage
    };
  }

  function publicDistrict(userId) {
    const membership = q.districtMembership.get(userId);
    if (!membership) return null;
    return {
      id: membership.district_id,
      name: membership.name,
      crest: membership.crest,
      role: membership.role,
      contribution: Number(membership.contribution),
      project: { total: Number(membership.project_total), goal: Number(membership.project_goal) },
      members: q.districtMembers.all(membership.district_id).map(row => ({
        userId: row.user_id,
        player: row.player_name,
        role: row.role,
        contribution: Number(row.contribution)
      }))
    };
  }

  function publicOpenDistricts() {
    return q.openDistricts.all().map(row => ({
      id: row.id,
      name: row.name,
      crest: row.crest,
      members: Number(row.member_count),
      project: { total: Number(row.project_total), goal: Number(row.project_goal) }
    }));
  }

  function snapshot(user) {
    const profile = q.profile.get(user.id);
    const pending = parseJson(profile.offline_pending_json, null);
    const stationRows = q.stations.all(user.id);
    const progression = progressionSnapshot(profile, stationRows);
    const { dayKey, weekKey } = ensureRetention(user.id);
    const daily = q.daily.get(user.id, dayKey);
    const retention = q.retention.get(user.id);
    const claimedMissions = parseJson(daily.claimed_json, []);
    const dailyMissions = dailyMissionDefinitions(profile.stage, daily).map(mission => ({
      ...mission,
      claimed: claimedMissions.includes(mission.id),
      ready: Number(mission.current) >= Number(mission.goal)
    }));
    const nextCheckinDay = retention.last_checkin_day === dayKey ? Number(retention.checkin_day) : (daysBetween(retention.last_checkin_day, dayKey) === 1 ? Number(retention.checkin_day) % 28 + 1 : 1);
    const weeklyGoal = 250 * Math.max(1, Number(profile.stage));
    return {
      gameId,
      serverNow: isoNow(),
      user: { id: user.id, name: user.name, avatarData: user.avatar_data || null },
      profile: {
        congregationName: profile.congregation_name,
        level: Number(profile.level),
        xp: Number(profile.xp),
        stage: Number(profile.stage),
        tutorialStep: Number(profile.tutorial_step),
        revision: Number(profile.revision)
      },
      economy: {
        offerings: Number(profile.offerings),
        gems: Number(profile.gems),
        materials: Number(profile.materials),
        reputation: Number(profile.reputation),
        districtPoints: Number(profile.district_points)
      },
      population: {
        visitors: Number(profile.visitors),
        attendees: Number(profile.attendees),
        catechumens: Number(profile.catechumens),
        members: Number(profile.members),
        volunteers: Number(profile.volunteers)
      },
      progression,
      retention: {
        dayKey,
        checkin: {
          day: nextCheckinDay,
          claimedToday: retention.last_checkin_day === dayKey,
          reward: checkinReward(nextCheckinDay)
        },
        dailyMissions,
        weekly: {
          weekKey,
          current: Number(retention.weekly_points),
          goal: weeklyGoal,
          claimed: Boolean(retention.weekly_claimed),
          ready: Number(retention.weekly_points) >= weeklyGoal,
          reward: { offerings: weeklyGoal * 4, gems: Math.max(1, Math.floor(Number(profile.stage) / 2)), materials: Number(profile.stage) * 8 }
        }
      },
      stations: stationRows.map(row => publicStation(row, profile.stage)),
      workers: q.workers.all(user.id).map(row => ({
        id: row.worker_id,
        role: row.role,
        level: Number(row.level),
        rarity: row.rarity,
        specialty: row.specialty,
        assignedStation: row.assigned_station || null
      })),
      offlineClaim: pending,
      district: publicDistrict(user.id),
      openDistricts: publicOpenDistricts(),
      rankings: q.rankings.all().map((row, index) => ({
        rank: index + 1,
        player: row.player_name,
        congregationName: row.congregation_name,
        level: Number(row.level),
        stage: Number(row.stage),
        members: Number(row.members)
      })),
      online: socketsByUser.size
    };
  }

  function refreshOffline(user) {
    ensurePlayer(user);
    const profile = q.profile.get(user.id);
    const now = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((now - Date.parse(profile.last_seen_at)) / 1000));
    if (profile.offline_pending_json || elapsedSeconds < 60) {
      q.updateSeen.run(new Date(now).toISOString(), new Date(now).toISOString(), user.id);
      return;
    }
    const cappedSeconds = Math.min(progressionSnapshot(profile, q.stations.all(user.id)).offlineHours * 60 * 60, elapsedSeconds);
    const pulpit = q.station.get(user.id, 'pulpit');
    const pulpitLevel = Math.max(1, Number(pulpit?.level || 1));
    const altarLevel = Math.max(1, Number(q.station.get(user.id, 'altar')?.level || 1));
    const stageMultiplier = 1 + (Number(profile.stage) - 1) * 0.22;
    const offerings = Math.max(1, Math.floor(cappedSeconds / 60 * Math.pow(1.12, pulpitLevel - 1) * (1 + (altarLevel - 1) * 0.04) * 1.5 * stageMultiplier));
    const catechesis = q.station.get(user.id, 'catechesis');
    const members = catechesis?.built ? Math.floor(cappedSeconds / 1800 * Math.pow(1.12, Math.max(0, Number(catechesis.level) - 1)) * stageMultiplier) : 0;
    const pending = { secondsAway: cappedSeconds, offerings, members, createdAt: new Date(now).toISOString() };
    q.setPending.run(JSON.stringify(pending), new Date(now).toISOString(), new Date(now).toISOString(), user.id);
  }

  function receipt(userId, key) {
    if (!key) return null;
    return parseJson(q.receipt.get(userId, key)?.response_json, null);
  }

  function saveReceipt(userId, key, action, response) {
    if (key) q.insertReceipt.run(userId, key, action, JSON.stringify(response), isoNow());
  }

  function collect(user, payload) {
    const stationId = String(payload.stationId || '');
    const key = String(payload.idempotencyKey || '').slice(0, 96);
    const prior = receipt(user.id, key);
    if (prior) return prior;
    const result = transaction(() => {
      const row = q.station.get(user.id, stationId);
      const definition = STATIONS[stationId];
      if (!row || !definition || !row.built || !definition.cycleSeconds) throw new Error('Esta estação ainda não produz recursos.');
      const now = Date.now();
      const elapsedMs = Math.max(0, now - Date.parse(row.last_collected_at));
      const profile = q.profile.get(user.id);
      const cycles = Math.min(8 + Number(profile.stage) * 4, Math.floor(elapsedMs / (definition.cycleSeconds * 1000)));
      if (cycles < 1) {
        const error = new Error('A atividade ainda está em andamento.');
        error.code = 'NOT_READY';
        error.remainingMs = Math.max(250, definition.cycleSeconds * 1000 - elapsedMs);
        throw error;
      }
      const workerBonus = row.active_worker_id ? 1.18 : 1;
      const levelBonus = Math.pow(1.18, Number(row.level) - 1);
      const altarLevel = Number(q.station.get(user.id, 'altar')?.level || 1);
      const entranceLevel = Number(q.station.get(user.id, 'entrance')?.level || 1);
      const benchesLevel = Number(q.station.get(user.id, 'benches')?.level || 1);
      const stageBonus = 1 + (Number(profile.stage) - 1) * 0.2;
      const offeringBonus = 1 + (altarLevel - 1) * 0.04;
      const visitorBonus = 1 + (entranceLevel - 1) * 0.04 + (benchesLevel - 1) * 0.025;
      const base = Math.floor(definition.baseOutput * cycles * levelBonus * workerBonus * stageBonus);
      let offerings = 0;
      let visitors = 0;
      let attendees = 0;
      let members = 0;
      let reputation = 0;
      if (stationId === 'pulpit') { offerings = Math.floor(base * offeringBonus); visitors = Math.floor(cycles * (1 + Number(row.level)) * visitorBonus); attendees = Math.floor(visitors / 3); }
      if (stationId === 'reception') { visitors = Math.floor(cycles * (1 + Number(row.level)) * visitorBonus); reputation = Math.floor(cycles * stageBonus); offerings = Math.floor(cycles * 5 * levelBonus * offeringBonus); }
      if (stationId === 'catechesis') { members = Math.floor(cycles * Math.pow(1.14, Number(row.level) - 1) * stageBonus); reputation = Math.floor(cycles * 2 * stageBonus); offerings = Math.floor(cycles * 8 * levelBonus * offeringBonus); }
      const xp = Math.max(1, cycles * 4 + members * 6);
      const collectedAt = new Date(Date.parse(row.last_collected_at) + cycles * definition.cycleSeconds * 1000).toISOString();
      q.updateStationCollect.run(collectedAt, user.id, stationId);
      const nowIso = new Date(now).toISOString();
      q.addProduction.run(offerings, visitors, attendees, members, reputation, xp, nowIso, nowIso, user.id);
      syncProfileLevel(user.id);
      addActivity(user.id, { collects: 1, members, weeklyPoints: Math.max(1, cycles + members * 2) });
      if (stationId === 'pulpit') q.tutorial.run(2, nowIso, user.id);
      if (stationId === 'catechesis') q.tutorial.run(9, nowIso, user.id);
      const response = { ok: true, action: 'collect', reward: { offerings, visitors, attendees, members, reputation, xp }, state: snapshot(user) };
      saveReceipt(user.id, key, 'collect', response);
      return response;
    });
    return result;
  }

  function upgrade(user, payload) {
    const stationId = String(payload.stationId || '');
    return transaction(() => {
      const row = q.station.get(user.id, stationId);
      const definition = STATIONS[stationId];
      if (!row || !definition || !row.built) throw new Error('Construa esta estação primeiro.');
      const profile = q.profile.get(user.id);
      const levelCap = Math.min(definition.maxLevel, stageLevelCap(profile.stage));
      if (Number(row.level) >= levelCap) throw new Error('Avance o estágio da congregação para liberar mais níveis.');
      const cost = upgradeCost(stationId, Number(row.level));
      const now = isoNow();
      const spent = q.spendOfferings.run(cost, 18, now, now, user.id, cost);
      if (Number(spent.changes) !== 1) throw new Error('Ofertas insuficientes para esta melhoria.');
      q.upgradeStation.run(user.id, stationId);
      syncProfileLevel(user.id);
      addActivity(user.id, { upgrades: 1, weeklyPoints: 20 });
      q.tutorial.run(3, now, user.id);
      return { ok: true, action: 'upgrade', cost, stationId, state: snapshot(user) };
    });
  }

  function build(user, payload) {
    const stationId = String(payload.stationId || '');
    return transaction(() => {
      const row = q.station.get(user.id, stationId);
      const definition = STATIONS[stationId];
      if (!row || !definition || !definition.buildCost) throw new Error('Slot de construção inválido.');
      if (row.built) throw new Error('A estação já foi construída.');
      const profile = q.profile.get(user.id);
      if (Number(profile.stage) < definition.unlockStage) throw new Error(`Esta estação é liberada no estágio ${definition.unlockStage}.`);
      const now = isoNow();
      const spent = q.spendOfferings.run(definition.buildCost, 30, now, now, user.id, definition.buildCost);
      if (Number(spent.changes) !== 1) throw new Error('Ofertas insuficientes para construir.');
      q.buildStation.run(now, user.id, stationId);
      syncProfileLevel(user.id);
      addActivity(user.id, { weeklyPoints: 50 });
      q.tutorial.run(stationId === 'reception' ? 5 : 7, now, user.id);
      return { ok: true, action: 'build', cost: definition.buildCost, stationId, state: snapshot(user) };
    });
  }

  function assignWorker(user, payload) {
    const workerId = String(payload.workerId || '');
    const stationId = String(payload.stationId || '');
    return transaction(() => {
      const worker = q.worker.get(user.id, workerId);
      const station = q.station.get(user.id, stationId);
      if (!worker || !station || !station.built) throw new Error('Trabalhador ou estação inválidos.');
      if (worker.role === 'Pastor' && !['pulpit', 'altar'].includes(stationId)) throw new Error('O pastor atua no púlpito ou altar.');
      if (worker.role === 'Voluntário' && !['reception', 'catechesis'].includes(stationId)) throw new Error('O voluntário atua na recepção ou catequese.');
      q.clearWorkerAssignment.run(user.id, stationId);
      if (worker.assigned_station) q.assignStation.run(null, user.id, worker.assigned_station);
      q.assignWorker.run(stationId, user.id, workerId);
      q.assignStation.run(workerId, user.id, stationId);
      q.tutorial.run(6, isoNow(), user.id);
      return { ok: true, action: 'assign-worker', state: snapshot(user) };
    });
  }

  function grantRewards(userId, reward, xp = 0) {
    const offerings = clampInt(reward?.offerings, 0, 2_000_000_000);
    const gems = clampInt(reward?.gems, 0, 1_000_000);
    const materials = clampInt(reward?.materials, 0, 2_000_000_000);
    const now = isoNow();
    q.grantRewards.run(offerings, gems, materials, clampInt(xp, 0, 10_000_000), now, now, userId);
    syncProfileLevel(userId);
    return { offerings, gems, materials };
  }

  function advanceStage(user) {
    return transaction(() => {
      const profile = q.profile.get(user.id);
      const progression = progressionSnapshot(profile, q.stations.all(user.id));
      if (!progression.next) throw new Error('A congregação já alcançou o estágio máximo atual.');
      if (!progression.next.ready) throw new Error('Conclua todos os requisitos antes de expandir.');
      const cost = progression.next.requirement.offerings;
      const reward = progression.next.reward || {};
      const now = isoNow();
      const spent = q.spendStage.run(cost, reward.gems || 0, reward.materials || 0, Number(profile.stage) * 220, now, now, user.id, Number(profile.stage), cost);
      if (Number(spent.changes) !== 1) throw new Error('Ofertas insuficientes para esta expansão.');
      syncProfileLevel(user.id);
      addActivity(user.id, { weeklyPoints: 100 * Number(profile.stage) });
      return { ok: true, action: 'advance-stage', cost, reward, state: snapshot(user) };
    });
  }

  function claimDaily(user) {
    return transaction(() => {
      const { dayKey } = ensureRetention(user.id);
      const retention = q.retention.get(user.id);
      if (retention.last_checkin_day === dayKey) throw new Error('O check-in de hoje já foi recebido.');
      const day = daysBetween(retention.last_checkin_day, dayKey) === 1 ? Number(retention.checkin_day) % 28 + 1 : 1;
      const reward = grantRewards(user.id, checkinReward(day), day * 4);
      q.setCheckin.run(day, dayKey, user.id);
      addActivity(user.id, { weeklyPoints: 10 + day });
      return { ok: true, action: 'daily-claim', reward, day, state: snapshot(user) };
    });
  }

  function claimMission(user, payload) {
    const missionId = String(payload.missionId || '');
    return transaction(() => {
      const profile = q.profile.get(user.id);
      const { dayKey } = ensureRetention(user.id);
      const daily = q.daily.get(user.id, dayKey);
      const claimed = parseJson(daily.claimed_json, []);
      const mission = dailyMissionDefinitions(profile.stage, daily).find(item => item.id === missionId);
      if (!mission) throw new Error('Missão diária desconhecida.');
      if (claimed.includes(missionId)) throw new Error('Esta recompensa já foi recebida.');
      if (Number(mission.current) < Number(mission.goal)) throw new Error('A missão ainda não foi concluída.');
      const reward = grantRewards(user.id, mission.reward, 35 * Number(profile.stage));
      q.setDailyClaims.run(JSON.stringify([...claimed, missionId]), user.id, dayKey);
      addActivity(user.id, { weeklyPoints: 30 });
      return { ok: true, action: 'mission-claim', reward, missionId, state: snapshot(user) };
    });
  }

  function claimWeeklyReward(user) {
    return transaction(() => {
      ensureRetention(user.id);
      const profile = q.profile.get(user.id);
      const retention = q.retention.get(user.id);
      const goal = 250 * Math.max(1, Number(profile.stage));
      if (retention.weekly_claimed) throw new Error('A recompensa semanal já foi recebida.');
      if (Number(retention.weekly_points) < goal) throw new Error('O objetivo semanal ainda não foi concluído.');
      const reward = grantRewards(user.id, { offerings: goal * 4, gems: Math.max(1, Math.floor(Number(profile.stage) / 2)), materials: Number(profile.stage) * 8 }, 120 * Number(profile.stage));
      q.claimWeekly.run(user.id);
      return { ok: true, action: 'weekly-claim', reward, state: snapshot(user) };
    });
  }

  function claimOffline(user, payload) {
    const key = String(payload.idempotencyKey || '').slice(0, 96);
    const prior = receipt(user.id, key);
    if (prior) return prior;
    return transaction(() => {
      const profile = q.profile.get(user.id);
      const pending = parseJson(profile.offline_pending_json, null);
      if (!pending) throw new Error('Nenhuma recompensa offline disponível.');
      const now = isoNow();
      q.clearPending.run(clampInt(pending.offerings, 0, 2_000_000_000), clampInt(pending.members, 0, 100_000), now, now, user.id);
      addActivity(user.id, { members: clampInt(pending.members, 0, 100_000), weeklyPoints: Math.max(5, Math.floor(clampInt(pending.secondsAway, 0, 43_200) / 600)) });
      const response = { ok: true, action: 'offline-claim', reward: pending, state: snapshot(user) };
      saveReceipt(user.id, key, 'offline-claim', response);
      return response;
    });
  }

  function createDistrict(user, payload) {
    const name = String(payload.name || '').replace(/\s+/g, ' ').trim().slice(0, 36);
    const crest = String(payload.crest || 'rosa-madeira').slice(0, 32);
    if (name.length < 3) throw new Error('O distrito precisa de um nome com ao menos 3 caracteres.');
    const districtId = transaction(() => {
      if (q.districtMembership.get(user.id)) throw new Error('Você já participa de um distrito.');
      const id = crypto.randomUUID();
      const now = isoNow();
      q.insertDistrict.run(id, name, crest, user.id, 5000, now);
      q.insertDistrictMember.run(id, user.id, 'fundador', now);
      return id;
    });
    emitDistrict(districtId);
    return { ok: true, action: 'district-create', state: snapshot(user) };
  }

  function joinDistrict(user, payload) {
    const districtId = String(payload.districtId || '');
    transaction(() => {
      if (q.districtMembership.get(user.id)) throw new Error('Você já participa de um distrito.');
      if (!q.district.get(districtId)) throw new Error('Distrito não encontrado.');
      q.insertDistrictMember.run(districtId, user.id, 'membro', isoNow());
    });
    namespace?.sockets.get([...socketsByUser.get(user.id) || []][0])?.join(`li:district:${districtId}`);
    emitDistrict(districtId);
    return { ok: true, action: 'district-join', state: snapshot(user) };
  }

  function contribute(user, payload) {
    const amount = clampInt(payload.amount, 10, 100_000);
    const districtId = transaction(() => {
      const membership = q.districtMembership.get(user.id);
      if (!membership) throw new Error('Entre em um distrito antes de contribuir.');
      const now = isoNow();
      const spent = q.spendContribution.run(amount, amount, now, now, user.id, amount);
      if (Number(spent.changes) !== 1) throw new Error('Ofertas insuficientes para esta contribuição.');
      q.addContribution.run(amount, membership.district_id, user.id);
      q.addDistrictTotal.run(amount, membership.district_id);
      addActivity(user.id, { weeklyPoints: Math.max(5, Math.floor(amount / 10)) });
      return membership.district_id;
    });
    emitDistrict(districtId);
    return { ok: true, action: 'district-contribute', amount, state: snapshot(user) };
  }

  function emitDistrict(districtId) {
    if (!namespace || !districtId) return;
    const district = q.district.get(districtId);
    if (!district) return;
    namespace.to(`li:district:${districtId}`).emit('district:update', {
      id: district.id,
      project: { total: Number(district.project_total), goal: Number(district.project_goal) },
      members: q.districtMembers.all(districtId).map(row => ({ player: row.player_name, contribution: Number(row.contribution) }))
    });
  }

  function emitPresence() {
    namespace?.emit('presence:update', { online: socketsByUser.size });
  }

  async function handleApi(req, res, url, user, { json, readBody, hasValidLaunch }) {
    if (!url.pathname.startsWith('/api/lutheran-idle')) return false;
    if (!user) { json(res, 401, { error: 'Login necessário.' }); return true; }
    if (!hasValidLaunch(req, user.id)) { json(res, 403, { error: 'Abra Lutheran Idle pelo Game Hub para renovar o lançamento.' }); return true; }
    ensurePlayer(user);
    try {
      if (req.method === 'GET' && url.pathname === '/api/lutheran-idle/bootstrap') {
        refreshOffline(user);
        json(res, 200, snapshot(user));
        return true;
      }
      const payload = req.method === 'POST' ? parseJson(await readBody(req), {}) : {};
      let result = null;
      if (req.method === 'POST' && url.pathname === '/api/lutheran-idle/collect') result = collect(user, payload);
      else if (req.method === 'POST' && url.pathname === '/api/lutheran-idle/upgrade') result = upgrade(user, payload);
      else if (req.method === 'POST' && url.pathname === '/api/lutheran-idle/build') result = build(user, payload);
      else if (req.method === 'POST' && url.pathname === '/api/lutheran-idle/assign-worker') result = assignWorker(user, payload);
      else if (req.method === 'POST' && url.pathname === '/api/lutheran-idle/advance-stage') result = advanceStage(user);
      else if (req.method === 'POST' && url.pathname === '/api/lutheran-idle/daily-claim') result = claimDaily(user);
      else if (req.method === 'POST' && url.pathname === '/api/lutheran-idle/mission-claim') result = claimMission(user, payload);
      else if (req.method === 'POST' && url.pathname === '/api/lutheran-idle/weekly-claim') result = claimWeeklyReward(user);
      else if (req.method === 'POST' && url.pathname === '/api/lutheran-idle/offline-claim') result = claimOffline(user, payload);
      else if (req.method === 'GET' && url.pathname === '/api/lutheran-idle/district') result = { ok: true, district: publicDistrict(user.id), openDistricts: publicOpenDistricts() };
      else if (req.method === 'POST' && url.pathname === '/api/lutheran-idle/district/create') result = createDistrict(user, payload);
      else if (req.method === 'POST' && url.pathname === '/api/lutheran-idle/district/join') result = joinDistrict(user, payload);
      else if (req.method === 'POST' && url.pathname === '/api/lutheran-idle/district/contribute') result = contribute(user, payload);
      if (!result) { json(res, 404, { error: 'Ação de Lutheran Idle desconhecida.' }); return true; }
      json(res, 200, result);
    } catch (error) {
      json(res, error.code === 'NOT_READY' ? 425 : 409, { error: error.message || 'A ação foi rejeitada pelo servidor.', code: error.code || 'CONFLICT', remainingMs: error.remainingMs || 0 });
    }
    return true;
  }

  function attachRealtime(io, { currentUser, hasValidLaunch }) {
    namespace = io.of('/lutheran-idle');
    namespace.use((socket, next) => {
      const user = currentUser(socket.request);
      if (!user || !hasValidLaunch(socket.request, user.id)) return next(new Error('launch_required'));
      ensurePlayer(user);
      socket.data.user = user;
      next();
    });
    namespace.on('connection', socket => {
      const user = socket.data.user;
      const userSockets = socketsByUser.get(user.id) || new Set();
      userSockets.add(socket.id);
      socketsByUser.set(user.id, userSockets);
      socket.join('li:global');
      const membership = q.districtMembership.get(user.id);
      if (membership) socket.join(`li:district:${membership.district_id}`);
      socket.emit('world:ready', { serverNow: isoNow(), online: socketsByUser.size });
      emitPresence();
      socket.on('disconnect', () => {
        const active = socketsByUser.get(user.id);
        active?.delete(socket.id);
        if (!active?.size) socketsByUser.delete(user.id);
        emitPresence();
      });
    });
  }

  return { handleApi, attachRealtime, snapshot, ensurePlayer };
}

module.exports = { createLutheranIdleService };
