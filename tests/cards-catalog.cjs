const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'public', 'cards', 'catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const allowedRarities = new Set(['Comum', 'Rara', 'Épica', 'Lendária', 'Deluxe']);

assert.equal(catalog.sourceCanvaDesignId, 'DAHHY_9luKs');
assert.equal(catalog.cards.length, 59);
assert.equal(new Set(catalog.cards.map(card => card.id)).size, 59);
assert.equal(new Set(catalog.cards.map(card => card.page)).size, 59);

for (const card of catalog.cards) {
  assert.ok(card.title && card.category, `${card.id} precisa de título e categoria`);
  assert.ok(allowedRarities.has(card.rarity), `${card.id} tem raridade inválida`);
  const imagePath = path.join(root, 'public', 'cards', card.image);
  assert.ok(fs.existsSync(imagePath), `Imagem ausente: ${card.image}`);
  assert.ok(fs.statSync(imagePath).size > 10_000, `Imagem pequena demais: ${card.image}`);
}

console.log(`Catálogo validado: ${catalog.cards.length} cartinhas e todos os arquivos presentes.`);
