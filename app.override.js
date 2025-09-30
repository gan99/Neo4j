/* UDM Graph dbltap override - build 2025-09-30 */
(function () {
  if (!window || !window.cy) {
    window.addEventListener('load', installWhenReady);
  } else {
    installWhenReady();
  }

  function installWhenReady() {
    const MAX_WAIT_MS = 6000;
    const start = Date.now();
    (function wait() {
      if (window.cy) {
        install();
      } else if (Date.now() - start < MAX_WAIT_MS) {
        setTimeout(wait, 150);
      } else {
        console.warn('[override] cy not found; dbltap override not installed.');
      }
    })();
  }

  function install() {
    const cy = window.cy;
    console.info('[override] Installing dbltap toggle (single-source, no-history) – build 2025-09-30');

    // Behavior flags
    const SINGLE_SOURCE_MODE = true;              // collapse others before expanding clicked node
    const USE_HISTORY_IN_NEIGHBOR_REQUEST = false;// do NOT send breadcrumb history in neighbors API

    // Remove any existing dbltap handlers to avoid duplicates
    try { cy.off('dbltap', 'node'); } catch (e) {}

    cy.on('dbltap', 'node', async function(evt) {
      const node = evt.target;
      const nodeId = node.id();
      const nodeType = node.data('label');
      const captionProp = (window.currentQuery && window.currentQuery.caption_property) || 'name';
      const nodeName = node.data(captionProp) || node.data('name');

      // --- Collapse if already expanded ---
      if (node.scratch('_expanded')) {
        collapseOwned(node);
        return;
      }

      // --- Optional breadcrumb UI maintenance (not used for API unless flag on) ---
      if (typeof window.clickedNodesHistory === 'object') {
        const existingNodeTypes = Object.keys(window.clickedNodesHistory);
        const clickedIndex = existingNodeTypes.indexOf(nodeType);
        if (clickedIndex > -1) {
          const newHistory = {};
          for (let i = 0; i < clickedIndex; i++) {
            const t = existingNodeTypes[i];
            newHistory[t] = window.clickedNodesHistory[t];
          }
          window.clickedNodesHistory = newHistory;
        }
        window.clickedNodesHistory[nodeType] = { id: nodeId, name: nodeName };
        if (typeof window.updateBreadcrumbTrail === 'function') window.updateBreadcrumbTrail();
      }

      const historyParams = (typeof window.clickedNodesHistory === 'object')
        ? Object.entries(window.clickedNodesHistory)
            .map(([type, info]) => `${encodeURIComponent(type)}_node_id=${encodeURIComponent(info.id)}`)
            .join('&')
        : '';

      // --- Build neighbors URL WITHOUT history (so only this node’s neighbors load) ---
      const qKey = (document.getElementById('current-query-key')?.value || '');
      let neighborsUrl =
        window.NEIGHBORS_API_URL_TEMPLATE.replace('{node_id}', nodeId) +
        `?limit=12&node_type=${encodeURIComponent(nodeType)}&query_key=${encodeURIComponent(qKey)}`;

      if (USE_HISTORY_IN_NEIGHBOR_REQUEST && historyParams) {
        neighborsUrl += `&${historyParams}`;
      }

      // --- Single-source mode: collapse all other expansions first ---
      if (SINGLE_SOURCE_MODE) {
        cy.nodes().forEach(other => {
          if (other.id() !== nodeId && other.scratch('_expanded')) collapseOwned(other);
        });
      }

      // --- Expand: snapshot → fetch → diff → ownership → local fan-out ---
      try {
        const beforeIds = new Set(cy.elements().map(e => e.id()));

        if (typeof window.fetchDataAndRender === 'function') {
          await window.fetchDataAndRender(neighborsUrl);
        } else {
          console.error('[override] fetchDataAndRender() missing');
          return;
        }
        if (typeof window.calculateRelativeSizes === 'function') window.calculateRelativeSizes();

        const addedAll  = cy.elements().filter(e => !beforeIds.has(e.id()));
        const addedNodes = addedAll.nodes().filter(n => n.id() !== nodeId);

        // Ownership + scratch for collapse
        const ownerId = node.id();
        addedAll.forEach(el => {
          const owners = Array.isArray(el.data('_owners')) ? el.data('_owners') : [];
          if (!owners.includes(ownerId)) {
            owners.push(ownerId);
            el.data('_owners', owners);
          }
        });
        node.scratch('_expanded', true);
        node.scratch('_expansionIds', addedAll.map(e => e.id()));
        node.scratch('_expansionCol', cy.collection(addedAll));
        node.addClass('expanded');

        // Local fan-out (ring + jitter; circle layout only when >=3 nodes)
        if (addedNodes.length > 0) {
          const center = node.position();
          const R = 120;
          const N = Math.max(1, addedNodes.length);

          addedNodes.positions((i) => {
            const theta = (2 * Math.PI * i) / N;
            return { x: center.x + R * Math.cos(theta), y: center.y + R * Math.sin(theta) };
          });
          addedNodes.forEach(n => {
            const p = n.position();
            n.position({ x: p.x + (Math.random()-0.5)*4, y: p.y + (Math.random()-0.5)*4 });
          });

          const BB = { x1: center.x - 160, y1: center.y - 160, x2: center.x + 160, y2: center.y + 160 };
          if (N >= 3) {
            addedNodes.layout({
              name: 'circle',
              fit: false,
              boundingBox: BB,
              animate: true
            }).run();
          }
        }

        if (typeof window.handleZoom === 'function') window.handleZoom();
      } catch (e) {
        console.error('[override] Expand failed', e);
      }
    });

    function collapseOwned(node) {
      const ownerId = node.id();
      const col = node.scratch('_expansionCol');
      if (col && col.length) {
        col.forEach(ele => {
          const owners = Array.isArray(ele.data('_owners')) ? ele.data('_owners') : [];
          const nextOwners = owners.filter(o => o !== ownerId);
          if (nextOwners.length === 0) ele.remove();
          else ele.data('_owners', nextOwners);
        });
      } else {
        const ids = node.scratch('_expansionIds') || [];
        ids.forEach(id => {
          const ele = cy.getElementById(id);
          if (ele && ele.length) {
            const owners = Array.isArray(ele.data('_owners')) ? ele.data('_owners') : [];
            const nextOwners = owners.filter(o => o !== ownerId);
            if (nextOwners.length === 0) ele.remove();
            else ele.data('_owners', nextOwners);
          }
        });
      }
      node.scratch('_expanded', false);
      node.scratch('_expansionIds', []);
      node.scratch('_expansionCol', null);
      node.removeClass('expanded');
    }
  }
})();