const path = require('node:path');

const root = path.resolve(__dirname, '..');

process.env.LUTHERAN_IDLE_LOCAL_PREVIEW = '1';
process.env.DB_PATH ||= path.join(root, 'data', 'lutheran-idle-preview.sqlite');
process.env.PORT ||= '3338';

require(path.join(root, 'server.js'));
