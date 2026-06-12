const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.join(__dirname, 'server.js');
const runtimePath = path.join(__dirname, '.server-og-runtime.js');
let code = fs.readFileSync(sourcePath, 'utf8');

const originalHead = `<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/assets/site.css?v=${GAME_VERSION}">`;
const patchedHead = `<title>${escapeHtml(title)}</title>
<meta name="description" content="Plataforma de jogos luteranos da Ortodoxia Luterana Gaming">
<meta property="og:title" content="Ortodoxia Luterana Gaming">
<meta property="og:description" content="Plataforma de jogos luteranos">
<meta property="og:type" content="website">
<meta property="og:url" content="https://pela-graca.squareweb.app/register">
<meta property="og:image" content="https://pela-graca.squareweb.app/assets/preview-ortodoxia-luterana-gaming.png?v=${GAME_VERSION}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1070">
<meta property="og:image:height" content="353">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Ortodoxia Luterana Gaming">
<meta name="twitter:description" content="Plataforma de jogos luteranos">
<meta name="twitter:image" content="https://pela-graca.squareweb.app/assets/preview-ortodoxia-luterana-gaming.png?v=${GAME_VERSION}">
<link rel="stylesheet" href="/assets/site.css?v=${GAME_VERSION}">`;

if (!code.includes('og:image')) {
  code = code.replace(originalHead, patchedHead);
}

fs.writeFileSync(runtimePath, code);
require(runtimePath);
