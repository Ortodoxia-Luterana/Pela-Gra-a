const fs = require('node:fs');
const path = require('node:path');
const { feature, neighbors } = require('topojson-client');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'games', 'crowns-and-councils', 'public', 'data', 'nuts2-2024-20m-3035.topo.json');
const target = path.join(root, 'games', 'crowns-and-councils', 'public', 'data', 'regions.json');
const topology = JSON.parse(fs.readFileSync(source, 'utf8'));
const object = topology.objects[Object.keys(topology.objects)[0]];
const geo = feature(topology, object);
const adjacency = neighbors(object.geometries);

function collectPoints(coordinates, points = []) {
  if (!Array.isArray(coordinates)) return points;
  if (typeof coordinates[0] === 'number') points.push(coordinates);
  else coordinates.forEach(item => collectPoints(item, points));
  return points;
}

const ids = new Set();
const regions = geo.features.map((item, index) => {
  const properties = item.properties || {};
  const id = String(properties.NUTS_ID || '');
  if (!id || ids.has(id)) throw new Error(`Identificador territorial inválido: ${id || '(vazio)'}`);
  ids.add(id);
  const points = collectPoints(item.geometry.coordinates);
  const centroid = points.reduce((sum, [x, y]) => [sum[0] + x, sum[1] + y], [0, 0]).map(value => Math.round(value / Math.max(1, points.length)));
  return {
    id,
    name: properties.NUTS_NAME || properties.NAME_LATN || id,
    countryCode: properties.CNTR_CODE || '',
    iso3Code: properties.ISO3_CODE || '',
    centroid,
    neighborIds: adjacency[index].map(neighborIndex => String(geo.features[neighborIndex].properties.NUTS_ID)).sort()
  };
}).sort((a, b) => a.id.localeCompare(b.id));

const byId = new Map(regions.map(item => [item.id, item]));
regions.forEach(region => region.neighborIds.forEach(neighborId => {
  const neighbor = byId.get(neighborId);
  if (!neighbor || !neighbor.neighborIds.includes(region.id)) throw new Error(`Adjacência não simétrica: ${region.id} ↔ ${neighborId}`);
}));

const catalog = {
  schemaVersion: 1,
  geographicVersion: 'NUTS-2024-20M-EPSG3035',
  sourceUrl: 'https://gisco-services.ec.europa.eu/distribution/v2/nuts/topojson/NUTS_RG_20M_2024_3035_LEVL_2.json',
  projection: 'EPSG:3035',
  regionCount: regions.length,
  regions
};
fs.writeFileSync(target, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Crowns and Councils: ${regions.length} regiões e catálogo validado.`);
