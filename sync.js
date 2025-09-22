document.addEventListener('DOMContentLoaded', function () {
  // Route API calls to DSS backend
  const API = (p) => (typeof getWebAppBackendUrl === 'function' ? getWebAppBackendUrl(p.replace(/^\//,'')) : p);

  // Endpoints
  const INFO_API_URL = 'api/connection-info';
  const QUERIES_API_URL = 'api/queries';

  // DOM refs
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

  // Utils
  const showLoader = () => { if (loader) loader.style.display = 'flex'; };
  const hideLoader = () => { if (loader) loader.style.display = 'none'; };

  const colorPalette = ['#5B8FF9','#61DDAA','#65789B','#F6BD16','#7262FD','#78D3F8','#9661BC','#F6903D','#008685','#F08BB4'];
  const labelColor = {};
  function colorFor(label) {
    if (!labelColor[label]) labelColor[label] = colorPalette[Object.keys(labelColor).length % colorPalette.length];
    return labelColor[label];
  }

  // Cytoscape init
  const cy = cytoscape({
    container: cyContainer,
    elements: [],
    style: [
      { selector: 'node', style: {
          'background-color': ele => colorFor(ele.data('label') || 'node'),
          'label': 'data(name)',
          'font-size': 12,
          'text-opacity': 0,
          'text-valign': 'center',
          'color': '#222'
      }},
      { selector: 'edge', style: {
          'width': ele => ele.data('weight') ? Math.min(Math.max(ele.data('weight'),1),10) : 1,
          'curve-style': 'unbundled-bezier',
          'target-arrow-shape': 'triangle',
          'line-color': '#bbb',
          'target-arrow-color': '#bbb',
          'label': 'data(label)',
          'font-size': 10,
          'text-opacity': 0,
          'color': '#444'
      }},
      { selector: '.labels-visible', style: { 'text-opacity': 1 } },
      { selector: ':parent', style: {
          'background-opacity': 0.25,
          'background-color': '#e0e0e0',
          'border-color': '#a0a0a0',
          'border-width': 1,
          'label': 'data(id)',
          'font-size': 16,
          'text-valign': 'top',
          'text-halign': 'center',
          'padding': '12px'
      }}
    ]
  });

  function relayout() {
    const layoutName = graphLayoutSelect ? graphLayoutSelect.value : 'cola';
    const edgeLen = edgeLengthSlider ? parseInt(edgeLengthSlider.value,10) : 70;
    const nodeSpace = nodeSpacingSlider ? parseInt(nodeSpacingSlider.value,10) : 20;

    const layouts = {
      cola: { name: 'cola', fit: false, padding: 20, maxSimulationTime: 10000, edgeLength: edgeLen, nodeSpacing: nodeSpace },
      fcose: { name: 'fcose', fit: false, nodeSeparation: nodeSpace, idealEdgeLength: edgeLen, quality: 'proof' },
      concentric: { name: 'concentric', fit: false, padding: 20 },
      circle: { name: 'circle', fit: false, padding: 20 },
      breadthfirst: { name: 'breadthfirst', fit: false, padding: 20, directed: false }
    };
    cy.layout(layouts[layoutName] || layouts.cola).run();
  }

  function rescaleEdgeWidths(minPx=1, maxPx=12, mode='log') {
    const edges = cy.edges('[weight]');
    if (!edges.length) return;
    const ws = edges.map(e => e.data('weight'));
    const minW = Math.min(...ws), maxW = Math.max(...ws);
    const mid = (minPx+maxPx)/2;
    const fLinear = w => (maxW===minW) ? mid : minPx + (w-minW)*(maxPx-minPx)/(maxW-minW);
    const fSqrt = w => {
      const rmin=Math.sqrt(minW), rmax=Math.sqrt(maxW), r=Math.sqrt(w);
      return (rmax===rmin)?mid:minPx + (r-rmin)*(maxPx-minPx)/(rmax-rmin);
    };
    const flog = w => {
      const g = x => Math.log10(1+x);
      const rmin=g(minW), rmax=g(maxW), r=g(w);
      return (rmax===rmin)?mid:minPx + (r-rmin)*(maxPx-minPx)/(rmax-rmin);
    };
    const scale = mode==='sqrt'?fSqrt:(mode==='linear'?fLinear:flog);
    edges.forEach(e => e.style('width', scale(e.data('weight'))));
  }

  function buildSearchUrl(key) {
    const txt = (textSearchInput && textSearchInput.value) ? textSearchInput.value : '';
    const lim = (limitInput && parseInt(limitInput.value,10)) || 25;
    const months = (timescaleSlider && parseInt(timescaleSlider.value,10)) || 1;
    const qp = new URLSearchParams({ text_search: txt, limit: String(lim), months: String(months) });
    return `api/search/${encodeURIComponent(key)}?${qp.toString()}`;
  }

  function buildNeighborsUrl(nodeId, nodeType, key) {
    const lim = (limitInput && parseInt(limitInput.value,10)) || 25;
    const qp = new URLSearchParams({ node_type: nodeType, query_key: key, limit: String(lim) });
    return `api/nodes/${encodeURIComponent(nodeId)}/neighbors?${qp.toString()}`;
  }

  let activeQuery = null;

  async function fetchAndRender(url, append=false, aroundNode=null) {
    showLoader();
    try {
      const r = await fetch(API(url));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!append) cy.elements().remove();
      const added = cy.add(data.graph || []);
      rescaleEdgeWidths(1, 14, 'log');
      relayout();
      if (summaryTotals) summaryTotals.textContent = `${cy.nodes().length} nodes, ${cy.edges().length} edges`;
      return added;
    } catch (e) {
      console.error('fetchAndRender failed', e);
      return null;
    } finally {
      hideLoader();
    }
  }

  async function populateNav() {
    try {
      const r = await fetch(API(QUERIES_API_URL));
      const queries = await r.json();
      queryList.innerHTML = '';
      queries.forEach(q => {
        const li = document.createElement('li');
        li.textContent = q.display_name || q.name;
        li.title = q.description || '';
        li.addEventListener('click', () => {
          activeQuery = q;
          queryTitle.textContent = q.display_name || q.name;
          fetchAndRender(buildSearchUrl(q.name), false);
        });
        queryList.appendChild(li);
      });
      if (queries.length) {
        activeQuery = queries[0];
        queryTitle.textContent = activeQuery.display_name || activeQuery.name;
        await fetchAndRender(buildSearchUrl(activeQuery.name), false);
      }
    } catch (e) {
      console.error('populateNav failed', e);
    }
  }

  if (searchButton) {
    searchButton.addEventListener('click', () => {
      if (!activeQuery) return;
      fetchAndRender(buildSearchUrl(activeQuery.name), false);
    });
  }
  if (timescaleSlider && timescaleLabel) {
    timescaleSlider.addEventListener('input', () => {
      const v = parseInt(timescaleSlider.value,10)||1;
      timescaleLabel.textContent = `Last ${v} month${v>1?'s':''}`;
    });
  }
  if (graphLayoutSelect) graphLayoutSelect.addEventListener('change', relayout);
  if (edgeLengthSlider) edgeLengthSlider.addEventListener('input', relayout);
  if (nodeSpacingSlider) nodeSpacingSlider.addEventListener('input', relayout);
  if (zoomSlider) zoomSlider.addEventListener('input', (e) => cy.zoom(parseFloat(e.target.value)));

  // dblclick expand neighbors
  let tapTimeout = null;
  cy.on('tap', 'node, edge', (evt) => {
    if (tapTimeout) clearTimeout(tapTimeout);
    tapTimeout = setTimeout(() => {}, 180);
  });
  cy.on('dbltap', 'node', async (evt) => {
    if (!activeQuery) return;
    const n = evt.target;
    const nodeId = n.id();
    const nodeType = n.data('label') || (Array.isArray(n.data('labels')) ? n.data('labels')[0] : 'Node');
    const url = buildNeighborsUrl(nodeId, nodeType, activeQuery.name);
    const added = await fetchAndRender(url, true, n);
    if (added && added.length) {
      const pos = n.position();
      added.nodes().positions(() => ({ x: pos.x + (Math.random()-0.5)*120, y: pos.y + (Math.random()-0.5)*120 }));
      relayout();
    }
  });

  async function updateHeaderInfo() {
    try {
      const r = await fetch(API(INFO_API_URL));
      if (!r.ok) return;
      const info = await r.json();
      const el = document.getElementById('db-info-span');
      if (el) el.innerHTML = `<span>User: ${info.user_name || ''}</span> | <span>Database: ${info.database_name || ''}</span>`;
    } catch (e) {
      console.warn('Header info not available');
    }
  }

  // start
  showLoader();
  updateHeaderInfo().then(populateNav).finally(hideLoader);
});
