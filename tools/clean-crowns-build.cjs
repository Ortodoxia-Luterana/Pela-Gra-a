const fs = require('node:fs');
const path = require('node:path');

const buildRoot = path.resolve(__dirname, '..', 'public', 'crowns-and-councils');

function visit(directory) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return visit(target);
    if (!/\.(?:js|css|html)$/.test(entry.name)) return;
    const source = fs.readFileSync(target, 'utf8');
    const clean = source.replace(/[ \t]+(?=\r?$)/gm, '');
    if (clean !== source) fs.writeFileSync(target, clean);
  });
}

visit(buildRoot);
