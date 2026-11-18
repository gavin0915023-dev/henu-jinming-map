// Both hosts serve the same Esri layer. Try the faster host observed in Edge first.
const hosts = ['server.arcgisonline.com', 'services.arcgisonline.com'];

export function imageryLayer(L) {
  const pending = new WeakMap();
  const Imagery = L.GridLayer.extend({
    createTile({x, y, z}, done) {
      const tile = document.createElement('img');
      tile.alt = '';
      tile.dataset.zoom = z;
      tile.dataset.imagery = 'pending';
      let timer;
      const cancel = () => {
        clearTimeout(timer);
        tile.onload = tile.onerror = null;
        pending.delete(tile);
      };
      const finish = (error) => {
        cancel();
        tile.dataset.imagery = error ? 'failed' : 'ready';
        if (error) tile.removeAttribute('src');
        done(error, tile);
      };
      const request = (index) => {
        const retry = () => {
          clearTimeout(timer);
          if (index + 1 < hosts.length) request(index + 1);
          else finish(new Error('Esri tile unavailable'));
        };
        tile.onload = () => finish(null);
        tile.onerror = retry;
        timer = setTimeout(retry, 6500);
        tile.src = `https://${hosts[index]}/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
      };
      pending.set(tile, cancel);
      request(0);
      return tile;
    }
  });
  const layer = new Imagery({maxZoom:20, maxNativeZoom:19, noWrap:true});
  layer.on('tileunload', ({tile}) => {
    if (!pending.has(tile)) return;
    pending.get(tile)();
    tile.removeAttribute('src');
  });
  return layer;
}

export function addCampusBasemap(L, map, campus, toLatLng) {
  const pane = map.createPane('campus-outline');
  pane.style.zIndex = '180';
  const renderer = L.canvas({pane:'campus-outline'});
  const point = ([x,z]) => toLatLng(x,z);
  const polygon = (ring, fillColor, color = fillColor, weight = 0) => L.polygon(ring.map(point), {
    renderer, fillColor, fillOpacity:1, color, weight, interactive:false
  }).addTo(map);
  polygon(campus.boundary, '#d4e5ce', '#88a482', 1.5);
  for (const [ring] of campus.green) polygon(ring, '#bed8b5');
  for (const ring of campus.plaza) polygon(ring, '#ded9c5');
  for (const [ring] of campus.sport) polygon(ring, '#c3d3a8', '#8ca678', 1);
  for (const ring of campus.water) polygon(ring, '#a1cbd0', '#79aab0', 1);
  for (const [line,width] of campus.road) L.polyline(line.map(point), {
    renderer, color:width > 8 ? '#faf3de' : '#f5f2e5', weight:width > 8 ? 4 : 2, interactive:false
  }).addTo(map);
  for (const [ring,,type,,,inside] of campus.building) {
    if (inside) polygon(ring, type === 'library' ? '#c1aa87' : '#c5bdac', '#948c7a', .8);
  }
}
