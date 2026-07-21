import { Application, Container, Graphics, Rectangle } from 'pixi.js';
import { feature } from 'topojson-client';

const DESIGN_WIDTH = 1600;
const DESIGN_HEIGHT = 980;
const MAP_PADDING = 70;
const COLORS = {
  neutral: [0x827b66, 0x777860, 0x8a806b, 0x6f7461, 0x8a755e],
  neutralHover: 0xc2ae75,
  own: 0x7f393f,
  foreign: 0x6b5448,
  pending: 0xb9893e,
  selected: 0xe1bd58,
  border: 0x292a22,
  coast: 0x1b211a
};

function polygonRings(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function visitCoordinates(coordinates, visit) {
  if (!Array.isArray(coordinates)) return;
  if (typeof coordinates[0] === 'number') {
    visit(coordinates);
    return;
  }
  coordinates.forEach(item => visitCoordinates(item, visit));
}

function projectionFor(features) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  features.forEach(item => visitCoordinates(item.geometry.coordinates, ([x, y]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }));
  const scale = Math.min(
    (DESIGN_WIDTH - MAP_PADDING * 2) / Math.max(1, maxX - minX),
    (DESIGN_HEIGHT - MAP_PADDING * 2) / Math.max(1, maxY - minY)
  );
  const offsetX = (DESIGN_WIDTH - (maxX - minX) * scale) / 2;
  const offsetY = (DESIGN_HEIGHT - (maxY - minY) * scale) / 2;
  return ([x, y]) => [offsetX + (x - minX) * scale, DESIGN_HEIGHT - offsetY - (y - minY) * scale];
}

function colorFromHex(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? Number.parseInt(value.slice(1), 16) : fallback;
}

function neutralColor(id) {
  const hash = [...String(id || '')].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 0);
  return COLORS.neutral[hash % COLORS.neutral.length];
}

function regionColor(region, realm, selected, id) {
  if (selected) return COLORS.selected;
  if (region?.status === 'claiming') return COLORS.pending;
  if (!region?.ownerRealmId) return neutralColor(id);
  return region.ownerRealmId === realm?.id ? colorFromHex(realm?.color, COLORS.own) : colorFromHex(region.ownerColor, COLORS.foreign);
}

function drawFeature(graphics, geoFeature, project, fill) {
  graphics.clear();
  polygonRings(geoFeature.geometry).forEach(rings => {
    const [outer, ...holes] = rings;
    if (!outer?.length) return;
    graphics.poly(outer.flatMap(project)).fill({ color: fill, alpha: 0.98 });
    holes.forEach(hole => graphics.poly(hole.flatMap(project)).cut());
    graphics.poly(outer.flatMap(project)).stroke({ color: COLORS.border, width: 1.4, alpha: 0.88 });
  });
}

export class CrownsMapStage {
  constructor(host, { onSelect }) {
    this.host = host;
    this.onSelect = onSelect;
    this.app = new Application();
    this.world = new Container();
    this.regions = new Map();
    this.drag = null;
    this.pointers = new Map();
  }

  async init(topologyUrl) {
    await this.app.init({
      resizeTo: this.host,
      backgroundColor: COLORS.coast,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: 'webgl'
    });
    this.app.canvas.className = 'cc-map-canvas';
    this.app.canvas.setAttribute('aria-label', 'Mapa político clicável da Europa, Norte da África, Rússia europeia e Oriente Médio');
    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = new Rectangle(0, 0, this.app.screen.width, this.app.screen.height);

    const response = await fetch(topologyUrl, { cache: 'force-cache' });
    if (!response.ok) throw new Error('A geometria oficial do mapa não foi carregada.');
    const topology = await response.json();
    const object = topology.objects[Object.keys(topology.objects)[0]];
    const collection = feature(topology, object);
    this.features = collection.features;
    this.project = projectionFor(this.features);
    this.buildRegions();
    this.fit();
    this.bindCamera();
  }

  buildRegions() {
    this.features.forEach(geoFeature => {
      const id = geoFeature.properties.REGION_ID || geoFeature.properties.NUTS_ID;
      const graphics = new Graphics();
      graphics.eventMode = 'static';
      graphics.cursor = 'pointer';
      graphics.on('pointertap', event => {
        event.stopPropagation();
        this.onSelect(id);
      });
      graphics.on('pointerover', () => {
        if (id !== this.selectedId) graphics.tint = COLORS.neutralHover;
      });
      graphics.on('pointerout', () => { graphics.tint = 0xffffff; });
      drawFeature(graphics, geoFeature, this.project, neutralColor(id));
      this.world.addChild(graphics);
      this.regions.set(id, { graphics, geoFeature });
    });
  }

  update(territories, realm, selectedId) {
    this.selectedId = selectedId;
    const byId = new Map((territories || []).map(item => [item.id, item]));
    this.regions.forEach(({ graphics, geoFeature }, id) => {
      graphics.tint = 0xffffff;
      drawFeature(graphics, geoFeature, this.project, regionColor(byId.get(id), realm, id === selectedId, id));
    });
  }

  bindCamera() {
    const canvas = this.app.canvas;
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      this.zoomAt(point, event.deltaY < 0 ? 1.13 : 0.885);
    }, { passive: false });
    canvas.addEventListener('pointerdown', event => {
      canvas.setPointerCapture(event.pointerId);
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.drag = { x: event.clientX, y: event.clientY, worldX: this.world.x, worldY: this.world.y };
    });
    canvas.addEventListener('pointermove', event => {
      const prior = this.pointers.get(event.pointerId);
      if (!prior) return;
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.pointers.size === 1 && this.drag) {
        this.world.position.set(this.drag.worldX + event.clientX - this.drag.x, this.drag.worldY + event.clientY - this.drag.y);
      }
    });
    const end = event => {
      this.pointers.delete(event.pointerId);
      if (!this.pointers.size) this.drag = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  zoomAt(point, factor) {
    const prior = this.world.scale.x;
    const next = Math.max(0.34, Math.min(3.4, prior * factor));
    const localX = (point.x - this.world.x) / prior;
    const localY = (point.y - this.world.y) / prior;
    this.world.scale.set(next);
    this.world.position.set(point.x - localX * next, point.y - localY * next);
  }

  zoomIn() { this.zoomAt({ x: this.app.screen.width / 2, y: this.app.screen.height / 2 }, 1.2); }
  zoomOut() { this.zoomAt({ x: this.app.screen.width / 2, y: this.app.screen.height / 2 }, 0.82); }
  fit() {
    const framing = this.app.screen.width < 900 ? 1.04 : 1.08;
    const scale = Math.min(this.app.screen.width / DESIGN_WIDTH, this.app.screen.height / DESIGN_HEIGHT) * framing;
    this.world.scale.set(scale);
    this.world.position.set(
      (this.app.screen.width - DESIGN_WIDTH * scale) / 2,
      (this.app.screen.height - DESIGN_HEIGHT * scale) / 2
    );
  }
  destroy() { this.app.destroy(true, { children: true }); }
}
