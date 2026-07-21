const path = require('node:path');

const root = path.resolve(__dirname, '..');

process.env.CROWNS_LOCAL_PREVIEW = '1';
process.env.CROWNS_ACTION_MS ||= '1500';
process.env.DB_PATH ||= path.join(root, 'data', 'crowns-preview.sqlite');
process.env.PORT ||= '3337';

require(path.join(root, 'server.js'));
