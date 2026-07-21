const base = `${import.meta.env.BASE_URL}assets/game/`;

export const assets = {
  background: `${base}room_stage_01_background.webp`,
  banner: `${base}banner_lutheran_idle.webp`,
  stations: {
    pulpit: [`${base}station_pulpit_l1.png`, `${base}station_pulpit_l2.png`, `${base}station_pulpit_l3.png`],
    benches: [`${base}station_benches_l1.png`, `${base}station_benches_l2.png`, `${base}station_benches_l3.png`],
    altar: `${base}station_altar_l1.png`,
    reception: `${base}station_reception_l1.png`,
    catechesis: `${base}station_catechesis_l1.png`
  },
  characters: {
    visitor: `${base}worker_visitor_walk.png`,
    pastor: `${base}worker_pastor_walk.png`,
    frameWidth: 192,
    frameHeight: 240
  },
  ui: {
    frame: `${base}ui_frame_wood.png`,
    button: `${base}ui_button_primary.png`,
    offerings: `${base}ui_icon_offerings.png`,
    members: `${base}ui_icon_members.png`
  }
} as const;
