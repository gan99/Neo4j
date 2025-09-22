document.addEventListener('DOMContentLoaded', function () {
  // ---------- DSS API helper ----------
  const API = (p) => (typeof getWebAppBackendUrl === 'function' ? getWebAppBackendUrl(p.replace(/^\//,'')) : p);

  // ---------- Endpoints ----------
  const INFO_API_URL = 'api/connection-info';
  const QUERIES_API_URL = 'api/queries';

  // ---------- DOM ----------
  const cyContainer = document.getElementById('cy');
  const loader = document.getElementById('loader');
  const queryList = document.getElementById('query-list');
  const queryTitle = document.getElementById('query-title');
  const textSearchInput = document.getElementById('text-search-input');
  const limitInput = document.getElementById('limit-input');
  const searchButton = document.getElementById('search-button');
  const timescaleSlider = document.getElementById('timescale-slider');
  const timescaleLabel = document.getElementById('timescale-label');
  const graphLayoutSelect = document.getElementById('graph-layout-select');
  const zoomSlider = document.getElementById('zoom-slider');
  const edgeLengthSlider = document.getElementById('edge-length-slider');
  const nodeSpacingSlider = document.getElementById('node-spacing-slider');
  const summaryTotals = document.getElementById('summary-totals');
  const dbInfoSpan = document.getElementById('db-info-span');

  const showLoader = () => { if (loader) loader.style.display = 'flex'; };
  const hideLoader = () => { if (loader) loader.style.display = 'none'; };

  // ---------- Colors ----------
  const colorPalette = ['#5B8FF9','#61DDAA','#65789B','#F6BD16','#7262FD','#78D3F8','#9661BC','#F6903D','#008685','#F08BB4'];
  const labelColor = {};
  function colorFor(label) {
    const key = label || 'node';
    if (!labelColor[key]) labelColor[key] = colorPalette[Object.keys(labelColor).length % colorPalette.length];
    return labelColor[key];
  }

  // ---------- Cytoscape ----------
  if (!cyContainer) {
    console.error('Missing #cy container');
    return;
  }

  // Ensure optional extensions don’t explode if not loaded
  try { if (typeof cytoscapePopper !== 'undefined') cytoscape.use(cytoscapePopper); } catch (e) {}

  const cy = cytoscape({
    container: cyContainer,
    elements: [],
    wheelSensitivity: 0.2,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': ele => colorFor(ele.data('label') || (Array.isArray(ele.data('labels')) ? ele.data('labels')[0] : 'node')),
          'label': 'data(name)',
          'font-size': 12,
          'text-opacity': 0,
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#222'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': ele => ele.data('weight') ? Math.min(Math.max(Number(ele.data('weight')), 1), 10) : 1,
          'curve-style': 'unbundled-bezier',
          'target-arrow-shape': 'triangle',
          'line-color': '#bdbdbd',
          'target-arrow-color': '#bdbdbd',
          'label': 'data(label)',
          'font-size': 10,
          'text-opacity': 0,
          'color': '#444'
        }
      },
      {
        selector: '.labels-visible',
        style: { 'text-opacity': 1 }
      },
      {
        selector: ':parent',
        style: {
          'background-opacity': 0.25,
          'background-color': '#e0e0e0',
          'border-color': '#a0a0a0',
          'border-width': 1,
          'label': 'data(id)',
          'font-size': 16,
          'text-valign': 'top',
          'text-halign': 'center',
          'padding': '12px'
        }
      }
    ]
  });

  // ---------- Layouts ----------
  function relayout() {
    const layoutName = graphLayoutSelect ? graphLayoutSelect.value : 'cola';
    const edgeLen = edgeLengthSlider ? parseInt(edgeLengthSlider.value,10) : 80;
    const nodeSpace = nodeSpacingSlider ? parseInt(nodeSpacingSlider.value,10) : 20;

    const layouts = {
      cola: { name: 'cola', fit: false, padding: 20, maxSimulationTime: 12000, edgeLength: edgeLen, nodeSpacing: nodeSpace },
      fcose: { name: 'fcose', fit: false, nodeSeparation: nodeSpace, idealEdgeLength: edgeLen, quality: 'proof' },
      concentric: { name: 'concentric', fit: false, padding: 20 },
      circle: { name: 'circle', fit: false, padding: 20 },
      breadthfirst: { name: 'breadthfirst', fit: false, padding: 20, directed: false }
    };

    const chosen = layouts[layoutName] || layouts.cola;
    try {
      cy.layout(chosen).run();
    } catch (e) {
      console.warn('Layout failed, falling back to cola:', e);
      cy.layout(layouts.cola).run();
    }
  }

  // ---------- Edge thickness scaler ----------
  function rescaleEdgeWidths(minPx=1, maxPx=14, mode='log') {
    const edges = cy.edges('[weight]');
    if (!edges.length) return;
    const ws = edges.map(e => Number(e.data('weight')) || 0);
    const minW = Math.min(...ws), maxW = Math.max(...ws);
    const mid = (minPx+maxPx)/2;

    const linear = w => (maxW===minW) ? mid : minPx + (w-minW)*(maxPx-minPx)/(maxW-minW);
    const sqrt = w => {
      const rmin=Math.sqrt(Math.max(minW,0)), rmax=Math.sqrt(Math.max(maxW,0)), r=Math.sqrt(Math.max(w,0));
      return (rmax===rmin)?mid:minPx + (r-rmin)*(maxPx-minPx)/(rmax-rmin);
    };
    const log = w => {
      const f = x => Math.log10(1+Math.max(x,0));
      const rmin=f(minW), rmax=f(maxW), r=f(w);
      return (rmax===rmin)?mid:minPx + (r-rmin)*(maxPx-minPx)/(rmax-rmin);
    };
    const scale = mode==='sqrt'?sqrt:(mode==='linear'?linear:log);

    edges.forEach(e => e.style('width', scale(Number(e.data('weight')) || 0)));
  }

  // ---------- URL builders ----------
  function buildSearchUrl(key) {
    const txt = textSearchInput && textSearchInput.value ? textSearchInput.value : '';
    const lim = (limitInput && parseInt(limitInput.value,10)) || 50;
    const months = (timescaleSlider && parseInt(timescaleSlider.value,10)) || 1;
    const qp = new URLSearchParams({ text_search: txt, limit: String(lim), months: String(months) });
    return `api/search/${encodeURIComponent(key)}?${qp.toString()}`;
  }

  function buildNeighborsUrl(nodeId, nodeType, key) {
    const lim = (limitInput && parseInt(limitInput.value,10)) || 25;
    const qp = new URLSearchParams({ node_type: nodeType, query_key: key, limit: String(lim) });
    return `api/nodes/${encodeURIComponent(nodeId)}/neighbors?${qp.toString()}`;
  }

  // ---------- Table helpers (no-ops if table not present) ----------
  function populateDataTable(rows, keys) {
    const tableHead = document.getElementById('data-table-head');
    const tableBody = document.getElementById('data-table-body');
    if (!tableHead || !tableBody) return;

    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (!rows || !rows.length) return;

    const trh = document.createElement('tr');
    (keys || Object.keys(rows[0] || {})).forEach(k => {
      const th = document.createElement('th');
      th.textContent = k;
      trh.appendChild(th);
    });
    tableHead.appendChild(trh);

    rows.forEach(r => {
      const tr = document.createElement('tr');
      (keys || Object.keys(r)).forEach(k => {
        const td = document.createElement('td');
        td.textContent = formatPropertyValue(k, r[k]);
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });
  }

  function formatPropertyValue(key, value) {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      if (key && key.toLowerCase().includes('amount')) return '$' + Number(value).toFixed(2);
      return String(value);
    }
    // simple ISO date
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0,10);
    return typeof value === 'string' ? value : JSON.stringify(value);
    // (No locale-specific formatting to avoid parse glitches)
  }

  // ---------- State ----------
  let activeQuery = null;

  // ---------- Fetch + render ----------
  async function fetchAndRender(url, append=false, aroundNode=null) {
    showLoader();
    try {
      const resp = await fetch(API(url));
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      // The backend should return {graph: [...]}; fallback to data if already array
      const elements = Array.isArray(data) ? data : (data.graph || []);
      if (!append) cy.elements().remove();

      const added = cy.add(elements);

      // Update sizes & layout
      rescaleEdgeWidths(1, 14, 'log');
      relayout();

      if (summaryTotals) summaryTotals.textContent = `${cy.nodes().length} nodes, ${cy.edges().length} edges`;

      // Optional: position new neighbors near the clicked node
      if (append && aroundNode && added && added.length) {
        const pos = aroundNode.position();
        added.nodes().positions(() => ({
          x: pos.x + (Math.random() - 0.5) * 140,
          y: pos.y + (Math.random() - 0.5) * 140
        }));
      }

      // Optional: fill table if provided
      if (data.records && data.keys) populateDataTable(data.records, data.keys);

      return added;
    } catch (e) {
      console.error('fetchAndRender failed', e);
      return null;
    } finally {
      hideLoader();
    }
  }

  // ---------- Nav ----------
  async function populateNav() {
    try {
      const r = await fetch(API(QUERIES_API_URL));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const queries = await r.json();

      if (queryList) queryList.innerHTML = '';

      (queries || []).forEach(q => {
        const key = q.key || q.name;          // backend may send 'key' or 'name'
        const display = q.display_name || key;
        if (!key) return;

        const li = document.createElement('li');
        li.className = 'query-list-item';
        li.textContent = display;
        if (q.description) li.title = q.description;

        li.addEventListener('click', async () => {
          activeQuery = { name: key, display_name: display };
          if (queryTitle) queryTitle.textContent = display;
          await fetchAndRender(buildSearchUrl(key), false);
        });

        if (queryList) queryList.appendChild(li);
      });

      // auto-load first
      if (queries && queries.length) {
        const first = queries[0];
        const key = first.key || first.name;
        const display = first.display_name || key;
        if (key) {
          activeQuery = { name: key, display_name: display };
          if (queryTitle) queryTitle.textContent = display;
          await fetchAndRender(buildSearchUrl(key), false);
        }
      }
    } catch (e) {
      console.error('populateNav failed', e);
    }
  }

  // ---------- Events ----------
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      if (!activeQuery) return;
      fetchAndRender(buildSearchUrl(activeQuery.name), false);
    });
  }

  if (timescaleSlider && timescaleLabel) {
    const updateTimescale = () => {
      const v = parseInt(timescaleSlider.value,10) || 1;
      timescaleLabel.textContent = `Last ${v} month${v>1?'s':''}`;
    };
    timescaleSlider.addEventListener('input', updateTimescale);
    updateTimescale();
  }

  if (graphLayoutSelect) graphLayoutSelect.addEventListener('change', relayout);
  if (edgeLengthSlider) edgeLengthSlider.addEventListener('input', relayout);
  if (nodeSpacingSlider) nodeSpacingSlider.addEventListener('input', relayout);
  if (zoomSlider) {
    zoomSlider.addEventListener('input', (e) => {
      const z = parseFloat(e.target.value);
      if (!isNaN(z)) cy.zoom(z);
    });
  }

  // Double-tap to expand neighbors
  let lastTapTime = 0;
  cy.on('tap', 'node', async (evt) => {
    const now = Date.now();
    if (now - lastTapTime < 300) {
      // treat as double tap
      if (!activeQuery) return;
      const n = evt.target;
      const nodeId = n.id();
      const nodeType = n.data('label') || (Array.isArray(n.data('labels')) ? n.data('labels')[0] : 'Node');
      const url = buildNeighborsUrl(nodeId, nodeType, activeQuery.name);
      await fetchAndRender(url, true, n);
    }
    lastTapTime = now;
  });

  // ---------- Header info ----------
  async function updateHeaderInfo() {
    try {
      const r = await fetch(API(INFO_API_URL));
      if (!r.ok) return;
      const info = await r.json();
      if (dbInfoSpan) {
        const user = info.user_name || '';
        const db   = info.database_name || '';
        dbInfoSpan.innerHTML = `<span>User: ${user}</span> | <span>Database: ${db}</span>`;
      }
    } catch (e) {
      console.warn('Header info unavailable');
    }
  }

  // ---------- Start ----------
  showLoader();
  updateHeaderInfo().then(populateNav).finally(hideLoader);
});
