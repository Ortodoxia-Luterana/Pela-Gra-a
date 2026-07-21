const path = require('node:path');

const root = path.resolve(__dirname, '..');

process.env.CROWNS_LOCAL_PREVIEW = '1';
process.env.CROWNS_ACTION_MS ||= '1500';
process.env.CROWNS_GAME_DAY_MS ||= '5000';
process.env.CROWNS_RESET_DELAY_MS ||= '60000';
process.env.DB_PATH ||= path.join(root, 'data', 'crowns-preview.sqlite');
process.env.PORT ||= '3337';

require(path.join(root, 'server.js'));
