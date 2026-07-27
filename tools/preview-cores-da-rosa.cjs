const path = require('node:path');

const root = path.resolve(__dirname, '..');

process.env.CORES_DA_ROSA_LOCAL_PREVIEW = '1';
process.env.DB_PATH ||= path.join(root, 'data', 'cores-da-rosa-preview.sqlite');
process.env.PORT ||= '3339';

require(path.join(root, 'server.js'));
