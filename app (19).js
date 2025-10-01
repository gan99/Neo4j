/* UDM Graph dbltap fix – build 2025-10-01 */
(function () {
  function installWhenReady() {
    const MAX_WAIT_MS = 8000;
    const start = Date.now();
    (function wait() {
      if (window && window.cy && typeof window.cy.on === 'function') {
        install();
      } else if (Date.now() - start < MAX_WAIT_MS) {
        setTimeout(wait, 120);
      } else {
        console.warn('[dbltap-fix] cy not ready; giving up.');
      }
    })();
  }

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

  function install() {
    const cy = window.cy;
    console.info('[dbltap-fix] Installing robust dbltap toggle – build 2025-10-01');

    // Flags
    const SINGLE_SOURCE_MODE = true;               // collapse others before expanding this one
    const USE_HISTORY_IN_NEIGHBOR_REQUEST = false; // do NOT send breadcrumb history to neighbors API

    // Helper: build URL for ONLY this node's neighbors
    function buildNeighborsUrl(node) {
      const nodeId   = node.id();
      const nodeType = node.data('label');
      const qKey = (document.getElementById('current-query-key')?.value || '');
      let url = window.NEIGHBORS_API_URL_TEMPLATE
        .replace('{node_id}', nodeId)
        + `?limit=12&node_type=${encodeURIComponent(nodeType)}&query_key=${encodeURIComponent(qKey)}`;
      if (USE_HISTORY_IN_NEIGHBOR_REQUEST) {
        // Optional: include breadcrumb if you explicitly flip the flag
        const hist = (typeof window.clickedNodesHistory === 'object') ? window.clickedNodesHistory : {};
        const historyParams = Object.entries(hist)
          .map(([type, info]) => `${encodeURIComponent(type)}_node_id=${encodeURIComponent(info.id)}`)
          .join('&');
        if (historyParams) url += `&${historyParams}`;
      }
      return url;
    }

    // Clear any prior dbltap handlers
    try { cy.off('dbltap', 'node'); } catch (e) {}

    cy.on('dbltap', 'node', async function(evt) {
      const node = evt.target;
      const nodeId = node.id();
      const nodeType = node.data('label');
      const captionProp = (window.currentQuery && window.currentQuery.caption_property) || 'name';
      const nodeName = node.data(captionProp) || node.data('name');

      // Collapse if already expanded
      if (node.scratch('_expanded')) {
        collapseOwned(node);
        return;
      }

      // Keep breadcrumb UI up-to-date (not used for API unless flag is on)
      if (typeof window.clickedNodesHistory !== 'object') {
        window.clickedNodesHistory = {};
      }
      const existingTypes = Object.keys(window.clickedNodesHistory);
      const idx = existingTypes.indexOf(nodeType);
      if (idx > -1) {
        const newHist = {};
        for (let i = 0; i < idx; i++) {
          const t = existingTypes[i]; newHist[t] = window.clickedNodesHistory[t];
        }
        window.clickedNodesHistory = newHist;
      }
      window.clickedNodesHistory[nodeType] = { id: nodeId, name: nodeName };
      if (typeof window.updateBreadcrumbTrail === 'function') window.updateBreadcrumbTrail();

      const neighborsUrl = buildNeighborsUrl(node);

      // Single-source: collapse ALL other expansions, but **preserve the clicked node**
      if (SINGLE_SOURCE_MODE) {
        cy.nodes().forEach(other => {
          if (other.id() !== nodeId && other.scratch('_expanded')) {
            const ownerId = other.id();
            const col = other.scratch('_expansionCol');
            if (col && col.length) {
              col.forEach(ele => {
                // never remove the clicked node element
                if (ele.id && ele.id() === nodeId) return;
                const owners = Array.isArray(ele.data('_owners')) ? ele.data('_owners') : [];
                const nextOwners = owners.filter(o => o !== ownerId);
                if (nextOwners.length === 0) ele.remove();
                else ele.data('_owners', nextOwners);
              });
            } else {
              const ids = other.scratch('_expansionIds') || [];
              ids.forEach(id => {
                if (id === nodeId) return;
                const ele = cy.getElementById(id);
                if (ele && ele.length) {
                  const owners = Array.isArray(ele.data('_owners')) ? ele.data('_owners') : [];
                  const nextOwners = owners.filter(o => o !== ownerId);
                  if (nextOwners.length === 0) ele.remove();
                  else ele.data('_owners', nextOwners);
                }
              });
            }
            other.scratch('_expanded', false);
            other.scratch('_expansionIds', []);
            other.scratch('_expansionCol', null);
            other.removeClass('expanded');
          }
        });
      }

      // Expand: snapshot -> fetch -> diff -> ownership -> local layout
      try {
        const beforeIds = new Set(cy.elements().map(e => e.id()));
        if (typeof window.fetchDataAndRender !== 'function') {
          console.error('[dbltap-fix] fetchDataAndRender missing');
          return;
        }
        await window.fetchDataAndRender(neighborsUrl);
        if (typeof window.calculateRelativeSizes === 'function') window.calculateRelativeSizes();

        const addedAll   = cy.elements().filter(e => !beforeIds.has(e.id()));
        const addedNodes = addedAll.nodes().filter(n => n.id() !== nodeId);

        // Ownership + scratch
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

        // Local fan-out
        if (addedNodes.length > 0) {
          const center = node.position();
          const R = 120;
          const N = Math.max(1, addedNodes.length);

          // initial ring
          addedNodes.positions((i) => {
            const theta = (2 * Math.PI * i) / N;
            return { x: center.x + R * Math.cos(theta), y: center.y + R * Math.sin(theta) };
          });

          // jitter
          addedNodes.forEach(n => {
            const p = n.position();
            n.position({ x: p.x + (Math.random()-0.5)*4, y: p.y + (Math.random()-0.5)*4 });
          });

          // small local circle layout only if >= 3 nodes
          if (N >= 3) {
            const BB = { x1: center.x - 160, y1: center.y - 160, x2: center.x + 160, y2: center.y + 160 };
            addedNodes.layout({ name: 'circle', fit: false, boundingBox: BB, animate: true }).run();
          }
        }

        if (typeof window.handleZoom === 'function') window.handleZoom();
      } catch (err) {
        console.error('[dbltap-fix] expand failed', err);
      }
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    installWhenReady();
  } else {
    document.addEventListener('DOMContentLoaded', installWhenReady);
  }
})();
