const fs = require('node:fs');
const path = require('node:path');
const proj4 = require('proj4');
const { feature, neighbors } = require('topojson-client');
const { topology } = require('topojson-server');

const root = path.resolve(__dirname, '..');
const publicData = path.join(root, 'games', 'crowns-and-councils', 'public', 'data');
const cacheDir = path.join(root, '.cache', 'crowns-map-sources');
const nuts2024Path = path.join(publicData, 'nuts2-2024-20m-3035.topo.json');
const topologyTarget = path.join(publicData, 'christian-theatre-2026-3035.topo.json');
const contextTopologyTarget = path.join(publicData, 'world-context-2026-3035.topo.json');
const catalogTarget = path.join(publicData, 'regions.json');
const naturalEarthCommit = 'ca96624a56bd078437bca8184e78163e5039ad19';
const ukNutsUrl = 'https://gisco-services.ec.europa.eu/distribution/v2/nuts/topojson/NUTS_RG_20M_2016_3035_LEVL_2.json';
const naturalEarthUrl = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${naturalEarthCommit}/geojson/ne_10m_admin_1_states_provinces.geojson`;
const naturalEarthCountriesUrl = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${naturalEarthCommit}/geojson/ne_110m_admin_0_countries.geojson`;
const epsg3035 = '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs';
const excludedNutsIds = new Set(['ES70', 'PT20', 'PT30']);
const extensionCountries = new Set([
  'GBR', 'UKR', 'BLR', 'MDA', 'RUS',
  'MAR', 'DZA', 'TUN', 'LBY', 'EGY',
  'ISR', 'PSX', 'LBN', 'JOR', 'SYR', 'IRQ', 'SAU', 'IRN',
  'GEO', 'ARM', 'AZE'
]);

const portugueseCountryNames = {
  AL: 'Albânia', BA: 'Bósnia e Herzegovina', LI: 'Liechtenstein', TR: 'Turquia', XK: 'Kosovo',
  AT: 'Áustria', BE: 'Bélgica', BG: 'Bulgária', CH: 'Suíça', CY: 'Chipre', CZ: 'Tchéquia', DE: 'Alemanha',
  DK: 'Dinamarca', EE: 'Estônia', EL: 'Grécia', ES: 'Espanha', FI: 'Finlândia', FR: 'França', HR: 'Croácia',
  HU: 'Hungria', IE: 'Irlanda', IS: 'Islândia', IT: 'Itália', LT: 'Lituânia', LU: 'Luxemburgo', LV: 'Letônia',
  ME: 'Montenegro', MK: 'Macedônia do Norte', MT: 'Malta', NL: 'Países Baixos', NO: 'Noruega', PL: 'Polônia',
  PT: 'Portugal', RO: 'Romênia', RS: 'Sérvia', SE: 'Suécia', SI: 'Eslovênia', SK: 'Eslováquia', UK: 'Reino Unido',
  UA: 'Ucrânia', BY: 'Belarus', MD: 'Moldávia', RU: 'Rússia', MA: 'Marrocos', DZ: 'Argélia', TN: 'Tunísia',
  LY: 'Líbia', EG: 'Egito', IL: 'Israel', PS: 'Palestina', LB: 'Líbano', JO: 'Jordânia', SY: 'Síria', IQ: 'Iraque',
  SA: 'Arábia Saudita', IR: 'Irã', GE: 'Geórgia', AM: 'Armênia', AZ: 'Azerbaijão'
};

const portugueseRegionNames = {
  BG31: 'Noroeste da Bulgária', BG32: 'Centro-Norte da Bulgária', BG33: 'Nordeste da Bulgária',
  BG34: 'Sudeste da Bulgária', BG41: 'Sudoeste da Bulgária', BG42: 'Centro-Sul da Bulgária',
  CY00: 'Chipre', EL30: 'Ática', EL41: 'Egeu Setentrional', EL42: 'Egeu Meridional', EL43: 'Creta',
  EL51: 'Macedônia Oriental e Trácia', EL52: 'Macedônia Central', EL53: 'Macedônia Ocidental', EL54: 'Epiro',
  EL61: 'Tessália', EL62: 'Ilhas Jônicas', EL63: 'Grécia Ocidental', EL64: 'Grécia Central', EL65: 'Peloponeso',
  ME00: 'Montenegro', MK00: 'Macedônia do Norte', RS11: 'Região de Belgrado', RS12: 'Voivodina',
  RS21: 'Šumadija e Sérvia Ocidental', RS22: 'Sérvia Meridional e Oriental', IS00: 'Islândia',
  IE04: 'Norte e Oeste da Irlanda', IE05: 'Sul da Irlanda', IE06: 'Leste e Centro da Irlanda',
  UKM6: 'Terras Altas e Ilhas', UKN0: 'Irlanda do Norte', UKI3: 'Londres Central-Oeste', UKI4: 'Londres Central-Leste'
};

const curatedMaritimeRoutes = [
  ['IS00', 'UKM6'], ['IS00', 'IE04'], ['IS00', 'NO0A'],
  ['UKM6', 'IE04'], ['UKN0', 'IE04'], ['UKK3', 'IE05'],
  ['ES53', 'ES52'], ['FRM0', 'ITG2'], ['FRM0', 'FRJ2'], ['ITG2', 'ITG1'], ['ITG1', 'MT00'],
  ['EL62', 'EL54'], ['EL41', 'EL52'], ['EL42', 'EL43'], ['EL43', 'EL41'], ['CY00', 'EL43']
];

async function cachedJson(url, fileName) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const target = path.join(cacheDir, fileName);
  if (!fs.existsSync(target)) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`);
    fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  }
  return JSON.parse(fs.readFileSync(target, 'utf8'));
}

function collectPoints(coordinates, points = []) {
  if (!Array.isArray(coordinates)) return points;
  if (typeof coordinates[0] === 'number') points.push(coordinates);
  else coordinates.forEach(item => collectPoints(item, points));
  return points;
}

function transformCoordinates(coordinates) {
  if (!Array.isArray(coordinates)) return coordinates;
  if (typeof coordinates[0] === 'number') return proj4('EPSG:4326', epsg3035, coordinates);
  return coordinates.map(transformCoordinates);
}

function normalizedFeature(item, metadata) {
  return {
    type: 'Feature',
    properties: {
      REGION_ID: metadata.id,
      REGION_NAME: metadata.name,
      COUNTRY_CODE: metadata.countryCode,
      ISO3_CODE: metadata.iso3Code,
      LEVEL_LABEL: metadata.levelLabel,
      SOURCE_KIND: metadata.sourceKind,
      COUNTRY_NAME: metadata.countryName || metadata.countryCode
    },
    geometry: item.geometry
  };
}

function nutsFeatures(topologyData, predicate, sourceKind) {
  const object = topologyData.objects[Object.keys(topologyData.objects)[0]];
  return feature(topologyData, object).features.filter(predicate).map(item => {
    const properties = item.properties || {};
    return normalizedFeature(item, {
      id: String(properties.NUTS_ID),
      name: portugueseRegionNames[String(properties.NUTS_ID)] || properties.NAME_LATN || properties.NUTS_NAME || properties.NUTS_ID,
      countryCode: properties.CNTR_CODE || '',
      iso3Code: properties.ISO3_CODE || '',
      countryName: portugueseCountryNames[properties.CNTR_CODE] || properties.CNTR_CODE || '',
      levelLabel: 'NUTS 2',
      sourceKind
    });
  });
}

function includeNaturalEarth(item) {
  const properties = item.properties || {};
  const country = properties.adm0_a3;
  if (!extensionCountries.has(country) || country === 'GBR') return false;
  if (country === 'RUS') {
    if (['Crimea', 'Sevastopol'].includes(properties.name)) return false;
    return Number(properties.longitude) < 61 && Number(properties.latitude) > 40;
  }
  return true;
}

function naturalEarthFeatures(data) {
  return data.features.filter(includeNaturalEarth).map(item => {
    const properties = item.properties || {};
    const projected = { ...item, geometry: { ...item.geometry, coordinates: transformCoordinates(item.geometry.coordinates) } };
    return normalizedFeature(projected, {
      id: `NE_${properties.ne_id}`,
      name: properties.name_pt || properties.name_en || properties.name || properties.adm1_code,
      countryCode: properties.iso_a2 || '',
      iso3Code: properties.adm0_a3 || '',
      countryName: portugueseCountryNames[properties.iso_a2] || properties.name_pt || properties.admin || properties.adm0_a3,
      levelLabel: properties.type_pt || properties.type_en || 'Admin. 1',
      sourceKind: 'NATURAL_EARTH_ADMIN1'
    });
  });
}

function featureStats(item) {
  const points = collectPoints(item.geometry.coordinates);
  const bounds = points.reduce((box, [x, y]) => ({
    minX: Math.min(box.minX, x), minY: Math.min(box.minY, y),
    maxX: Math.max(box.maxX, x), maxY: Math.max(box.maxY, y)
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  const centroid = points.reduce((sum, [x, y]) => [sum[0] + x, sum[1] + y], [0, 0]).map(value => Math.round(value / Math.max(1, points.length)));
  const step = Math.max(1, Math.ceil(points.length / 90));
  return { bounds, centroid, samples: points.filter((_, index) => index % step === 0) };
}

function boundsDistance(a, b) {
  const dx = Math.max(0, a.minX - b.maxX, b.minX - a.maxX);
  const dy = Math.max(0, a.minY - b.maxY, b.minY - a.maxY);
  return Math.hypot(dx, dy);
}

function sampleDistance(a, b, limit = Infinity) {
  let best = limit;
  for (const [ax, ay] of a) {
    for (const [bx, by] of b) {
      const distance = Math.hypot(ax - bx, ay - by);
      if (distance < best) best = distance;
    }
  }
  return best;
}

function connect(adjacency, routeAdjacency, a, b, inferred = false) {
  if (a === b) return;
  adjacency[a].add(b);
  adjacency[b].add(a);
  if (inferred) {
    routeAdjacency[a].add(b);
    routeAdjacency[b].add(a);
  }
}

function components(adjacency) {
  const remaining = new Set(adjacency.map((_, index) => index));
  const result = [];
  while (remaining.size) {
    const start = remaining.values().next().value;
    const stack = [start];
    const component = [];
    remaining.delete(start);
    while (stack.length) {
      const current = stack.pop();
      component.push(current);
      adjacency[current].forEach(next => {
        if (!remaining.has(next)) return;
        remaining.delete(next);
        stack.push(next);
      });
    }
    result.push(component);
  }
  return result;
}

function bridgeComponents(adjacency, routeAdjacency, stats) {
  let groups = components(adjacency);
  while (groups.length > 1) {
    let best = { distance: Infinity, a: -1, b: -1 };
    for (let left = 0; left < groups.length; left += 1) {
      for (let right = left + 1; right < groups.length; right += 1) {
        for (const a of groups[left]) {
          for (const b of groups[right]) {
            const distance = boundsDistance(stats[a].bounds, stats[b].bounds);
            if (distance < best.distance) best = { distance, a, b };
          }
        }
      }
    }
    if (best.a < 0) throw new Error('Não foi possível conectar o teatro por fronteiras ou rotas marítimas.');
    connect(adjacency, routeAdjacency, best.a, best.b, true);
    groups = components(adjacency);
  }
}

function connectCuratedMaritimeRoutes(features, adjacency, routeAdjacency) {
  const indexById = new Map(features.map((item, index) => [item.properties.REGION_ID, index]));
  curatedMaritimeRoutes.forEach(([fromId, toId]) => {
    const from = indexById.get(fromId);
    const to = indexById.get(toId);
    if (from !== undefined && to !== undefined) connect(adjacency, routeAdjacency, from, to, true);
  });
}

async function build() {
  const nuts2024 = JSON.parse(fs.readFileSync(nuts2024Path, 'utf8'));
  const [nuts2016, naturalEarth, naturalEarthCountries] = await Promise.all([
    cachedJson(ukNutsUrl, 'nuts2-2016-20m-3035.json'),
    cachedJson(naturalEarthUrl, `natural-earth-admin1-${naturalEarthCommit}.geojson`),
    cachedJson(naturalEarthCountriesUrl, `natural-earth-admin0-110m-${naturalEarthCommit}.geojson`)
  ]);

  const mainlandNuts = nutsFeatures(nuts2024, item => {
    const id = String(item.properties?.NUTS_ID || '');
    return id && !id.startsWith('FRY') && !excludedNutsIds.has(id);
  }, 'GISCO_NUTS_2024');
  const britishNuts = nutsFeatures(nuts2016, item => item.properties?.CNTR_CODE === 'UK', 'GISCO_NUTS_2016_UK');
  const extensions = naturalEarthFeatures(naturalEarth);
  const features = [...mainlandNuts, ...britishNuts, ...extensions];
  const ids = new Set();
  features.forEach(item => {
    const id = item.properties.REGION_ID;
    if (!id || ids.has(id)) throw new Error(`Identificador territorial inválido ou duplicado: ${id || '(vazio)'}`);
    ids.add(id);
  });

  const theatreTopology = topology({ regions: { type: 'FeatureCollection', features } }, 100000);
  const contextFeatures = naturalEarthCountries.features
    .filter(item => String(item.properties?.ADM0_A3 || item.properties?.adm0_a3 || '') !== 'ATA')
    .map((item, index) => ({
      type: 'Feature',
      properties: {
        CONTEXT_ID: String(item.properties?.ADM0_A3 || item.properties?.adm0_a3 || item.properties?.ISO_A3 || `context-${index}`),
        CONTEXT_NAME: item.properties?.NAME_PT || item.properties?.NAME_EN || item.properties?.ADMIN || item.properties?.NAME || 'Terra não jogável'
      },
      geometry: { ...item.geometry, coordinates: transformCoordinates(item.geometry.coordinates) }
    }));
  const contextTopology = topology({ countries: { type: 'FeatureCollection', features: contextFeatures } }, 60000);
  const object = theatreTopology.objects.regions;
  const geo = feature(theatreTopology, object);
  const stats = geo.features.map(featureStats);
  const adjacency = neighbors(object.geometries).map(items => new Set(items));
  const routeAdjacency = adjacency.map(() => new Set());

  for (let a = 0; a < geo.features.length; a += 1) {
    for (let b = a + 1; b < geo.features.length; b += 1) {
      const sourceA = geo.features[a].properties.SOURCE_KIND;
      const sourceB = geo.features[b].properties.SOURCE_KIND;
      if (sourceA === sourceB || adjacency[a].has(b)) continue;
      const gap = boundsDistance(stats[a].bounds, stats[b].bounds);
      if (gap > 55000) continue;
      if (sampleDistance(stats[a].samples, stats[b].samples, 55001) <= 55000) connect(adjacency, routeAdjacency, a, b, true);
    }
  }
  connectCuratedMaritimeRoutes(geo.features, adjacency, routeAdjacency);
  bridgeComponents(adjacency, routeAdjacency, stats);

  const regions = geo.features.map((item, index) => ({
    id: item.properties.REGION_ID,
    name: item.properties.REGION_NAME,
    countryCode: item.properties.COUNTRY_CODE,
    iso3Code: item.properties.ISO3_CODE,
    countryName: item.properties.COUNTRY_NAME,
    levelLabel: item.properties.LEVEL_LABEL,
    sourceKind: item.properties.SOURCE_KIND,
    centroid: stats[index].centroid,
    neighborIds: [...adjacency[index]].map(neighborIndex => geo.features[neighborIndex].properties.REGION_ID).sort(),
    routeNeighborIds: [...routeAdjacency[index]].map(neighborIndex => geo.features[neighborIndex].properties.REGION_ID).sort()
  })).sort((a, b) => a.id.localeCompare(b.id));

  const byId = new Map(regions.map(item => [item.id, item]));
  regions.forEach(region => region.neighborIds.forEach(neighborId => {
    const neighbor = byId.get(neighborId);
    if (!neighbor || !neighbor.neighborIds.includes(region.id)) throw new Error(`Adjacência não simétrica: ${region.id} ↔ ${neighborId}`);
  }));
  if (regions.some(region => region.id.startsWith('FRY') || excludedNutsIds.has(region.id))) throw new Error('O teatro ainda contém territórios ultramarinos excluídos.');
  if (!regions.some(region => region.countryCode === 'UK')) throw new Error('A Inglaterra e o restante da Grã-Bretanha não foram incluídos.');
  if (!regions.some(region => region.iso3Code === 'RUS')) throw new Error('A Rússia europeia não foi incluída.');
  if (!regions.some(region => /jerusal[ée]m/i.test(region.name))) throw new Error('Jerusalém não foi localizada no catálogo territorial.');
  if (regions.some(region => region.neighborIds.length === 0)) throw new Error('Há regiões sem fronteira ou rota de expansão.');

  const catalog = {
    schemaVersion: 3,
    geographicVersion: 'CHRISTIAN-THEATRE-2026-EPSG3035-v3',
    sourceUrl: 'https://gisco-services.ec.europa.eu/distribution/v2/nuts/',
    sourceUrls: [
      'https://gisco-services.ec.europa.eu/distribution/v2/nuts/',
      'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/'
    ],
    projection: 'EPSG:3035',
    topologyFile: 'christian-theatre-2026-3035.topo.json',
    contextTopologyFile: 'world-context-2026-3035.topo.json',
    regionCount: regions.length,
    countryCount: new Set(regions.map(region => region.countryCode)).size,
    theatre: 'Europa, Norte da África, Rússia europeia e Oriente Médio',
    regions
  };
  fs.writeFileSync(topologyTarget, `${JSON.stringify(theatreTopology)}\n`);
  fs.writeFileSync(contextTopologyTarget, `${JSON.stringify(contextTopology)}\n`);
  fs.writeFileSync(catalogTarget, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Crowns and Councils: ${regions.length} regiões em ${catalog.countryCount} países; Jerusalém e rotas marítimas validadas.`);
}

build().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
