// app/static/app.js
document.addEventListener('DOMContentLoaded', function() {
    if (typeof cytoscape('core', 'popperRef') === 'undefined') {
        cytoscape.use(cytoscapePopper);
    }

    const INFO_API_URL = '/api/connection-info';
    const QUERIES_API_URL = '/api/queries';
function setActiveQueryKey(key){ const i=document.getElementById('current-query-key'); if(i){ i.value = key || ''; } }

    const SEARCH_API_URL_TEMPLATE = '/api/search/{query_name}';
    const NEIGHBORS_API_URL_TEMPLATE = '/api/nodes/{node_id}/neighbors';
    const NODE_PROPERTIES_API_URL_TEMPLATE = '/api/nodes/{node_id}/properties';
    const EDGE_PROPERTIES_API_URL_TEMPLATE = '/api/edges/{edge_id}/properties';

    let currentQuery = {};
    let clickedNodesHistory = {};

    const cyContainer = document.getElementById('cy');
    const loader = document.getElementById('loader');
    const propertiesPanel = document.getElementById('properties-panel');
    const propertiesTitle = document.getElementById('properties-title');
    const zoomSlider = document.getElementById('zoom-slider');
    const edgeLengthSlider = document.getElementById('edge-length-slider');
    const nodeSpacingSlider = document.getElementById('node-spacing-slider');
    const queryTitle = document.getElementById('query-title');
    const breadcrumbTrail = document.getElementById('breadcrumb-trail');
    const textSearchInput = document.getElementById('text-search-input');
    const limitInput = document.getElementById('limit-input');
    const searchButton = document.getElementById('search-button');
    const graphLayoutSelect = document.getElementById('graph-layout-select');
    const legendContent = document.getElementById('legend-content');
    const dataTable = document.getElementById('data-table');
    const summaryTotals = document.getElementById('summary-totals');
    const timescaleSlider = document.getElementById('timescale-slider');
    const timescaleLabel = document.getElementById('timescale-label');

    const colorPalette = ['#5B8FF9', '#61DDAA', '#65789B', '#F6BD16', '#7262FD', '#78D3F8', '#9661BC', '#F6903D', '#008685', '#F08BB4'];
    const labelColorMap = {};
    let colorIndex = 0;
    function getColorForLabel(label) {
        if (!labelColorMap[label]) {
            labelColorMap[label] = colorPalette[colorIndex % colorPalette.length];
            colorIndex++;
        }
        return labelColorMap[label];
    }

    function getReadableTextColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#ffffff';
    }
    
    function updateBreadcrumbTrail() {
        if (!breadcrumbTrail) return;
        breadcrumbTrail.innerHTML = ''; // Clear previous breadcrumbs
    
        const historyEntries = Object.entries(clickedNodesHistory);
    
        historyEntries.forEach(([type, nodeInfo], index) => {
            const valueSpan = document.createElement('span');
            valueSpan.className = 'breadcrumb-value';
            valueSpan.textContent = nodeInfo.name;
            
            const color = getColorForLabel(type);
            valueSpan.style.backgroundColor = color;
            valueSpan.style.color = getReadableTextColor(color);
    
            breadcrumbTrail.appendChild(valueSpan);
    
            if (index < historyEntries.length - 1) {
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-separator';
                separator.textContent = '/';
                breadcrumbTrail.appendChild(separator);
            }
        });
    }

    function populateDataTable(records, keys) {
        const tbody = dataTable.querySelector('tbody');
        tbody.innerHTML = '';
        summaryTotals.innerHTML = '';
    
        if (!records || records.length === 0) return;
    
        // --- Summary Calculation ---
        let summaryHTML = `<span class="summary-item"><strong>Records:</strong> ${records.length}</span>`;
        const amountTotals = {};
    
        records.forEach(record => {
            keys.forEach(key => {
                const cellData = record[key];
                if (cellData && cellData.properties) {
                    Object.entries(cellData.properties).forEach(([propKey, propValue]) => {
                        if (propKey.toLowerCase().includes('amount') && typeof propValue === 'number') {
                            const type = cellData._labels?.[0] || cellData._relation_type || 'Amount';
                            const header = `${type} (Total)`;
                            amountTotals[header] = (amountTotals[header] || 0) + propValue;
                        }
                    });
                }
            });
        });
    
        for (const [key, total] of Object.entries(amountTotals)) {
            summaryHTML += `<span class="summary-item"><strong>${key}:</strong> ${total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>`;
        }
        summaryTotals.innerHTML = summaryHTML;
    
        // --- Body Generation with Rowspan ---
        const processedRecords = records.map(r => ({...r, _processed: {}}));

        keys.forEach((key, colIndex) => {
            for (let i = 0; i < processedRecords.length; i++) {
                if (processedRecords[i]._processed[key]) continue;

                const currentValue = JSON.stringify(processedRecords[i][key]);
                let rowspan = 1;
                for (let j = i + 1; j < processedRecords.length; j++) {
                    if (JSON.stringify(processedRecords[j][key]) === currentValue) {
                        rowspan++;
                        processedRecords[j]._processed[key] = true; // Mark as handled
                    } else {
                        break;
                    }
                }
                processedRecords[i]._processed[key] = { rowspan: rowspan };
            }
        });

        processedRecords.forEach(record => {
            const row = document.createElement('tr');
            keys.forEach(key => {
                if (record._processed[key] && record._processed[key].rowspan) {
                    const td = document.createElement('td');
                    td.setAttribute('rowspan', record._processed[key].rowspan);
                    const cellData = record[key];
    
                    if (cellData && cellData.properties) {
                        const type = cellData._labels?.[0] || cellData._relation_type;
                        const propsToShow = currentQuery.table_display?.[type] || currentQuery.table_display?._default || [];
                        
                        const propValues = propsToShow.map(p => formatPropertyValue(p, cellData.properties[p])).join(', ');
        
                        td.innerHTML = `<span class="cell-type" style="color:${getColorForLabel(type)}">${type}</span><span class="cell-props">(${propValues})</span>`;
                    } else {
                        td.textContent = formatPropertyValue(key, cellData);
                    }
                    row.appendChild(td);
                }
            });
            tbody.appendChild(row);
        });
    }

    const layouts = {
        cola: {
            name: 'cola',
            animate: true,
            refresh: 1,
            maxSimulationTime: 20000,
            ungrabifyWhileSimulating: false,
            fit: false,
            padding: 50,
            nodeDimensionsIncludeLabels: false,
            ready: function(){},
            stop: function(){},
            randomize: false,
            avoidOverlap: true,
            handleDisconnected: true,
            convergenceThreshold: 0.01,
            nodeSpacing: (node) => 20,
            centerGraph: true,
            edgeLength: 150
        },
        fcose: {
            name: 'fcose',
            quality: "default",
            randomize: true,
            animate: false,
            animationDuration: 1000,
            fit: false,
            padding: 30,
            nodeDimensionsIncludeLabels: false,
            uniformNodeDimensions: false,
            packComponents: true,
            step: "all",
            nodeSeparation: 75,
            nodeRepulsion: node => 20000,
            idealEdgeLength: edge => 200,
            edgeElasticity: edge => 0.55,
            nestingFactor: 0.1,
            numIter: 2500,
            tile: true,
            tilingPaddingVertical: 10,
            tilingPaddingHorizontal: 10,
            gravity: 0.25,
            gravityRangeCompound: 1.5,
            gravityCompound: 1.0,
            gravityRange: 3.8,
            initialEnergyOnIncremental: 0.3,
            ready: () => {},
            stop: () => {}
        },
        concentric: {
            name: 'concentric',
            fit: false,
            padding: 30,
            startAngle: 3 / 2 * Math.PI,
            clockwise: true,
            equidistant: false,
            minNodeSpacing: 10,
            avoidOverlap: true,
            nodeDimensionsIncludeLabels: false,
            spacingFactor: undefined,
            concentric: function( node ){
                return node.degree();
            },
            levelWidth: function( nodes ){
                return nodes.maxDegree() / 4;
            },
            animate: false
        },
        circle: {
            name: 'circle',
            fit: true,
            padding: 30,
            radius: undefined,
            startAngle: 3/2 * Math.PI,
            clockwise: true,
            avoidOverlap: true,
            nodeDimensionsIncludeLabels: false,
        },
        breadthfirst: {
            name: 'breadthfirst',
            fit: false,
            directed: true,
            padding: 30,
            circle: false,
            grid: false,
            spacingFactor: 1.5,
            avoidOverlap: true,
            nodeDimensionsIncludeLabels: false,
            maximal: false,
            animate: true,
            animationDuration: 500,
            transform: function (node, position) {
                return {
                    x: position.y,
                    y: position.x
                };
            }
        }
    };
    
    const cy = cytoscape({
        container: cyContainer,
        style: [
            { 
                selector: 'node', 
                style: { 
                    'background-color': (ele) => getColorForLabel(ele.data('label')), 
                    'label': (ele) => ele.data(currentQuery.caption_property) || ele.data('name'),
                    'width': (ele) => ele.data('relative_size') ? 8 + ele.data('relative_size') * 20 : 13,
                    'height': (ele) => ele.data('relative_size') ? 8 + ele.data('relative_size') * 20 : 13,
                    'text-opacity': 0, 'color': '#333', 'font-size': '12px', 'border-width': 0
                } 
            },
            { selector: 'node.labels-visible', style: { 'text-opacity': 1 } },
            { 
                selector: 'edge', 
                style: { 
                    'width': (ele) => ele.data('weight') ? Math.min(Math.max(ele.data('weight'), 1), 10) : 1,
                    'target-arrow-shape': 'triangle', 'curve-style': 'unbundled-bezier',
                    'line-color': '#ccc', 'target-arrow-color': '#ccc', 'label': 'data(label)',
                    'text-opacity': 0, 'font-size': '10px', 'color': '#555'
                } 
            },
            { selector: 'edge.labels-visible', style: { 'text-opacity': 1 } },
            { selector: '.selected', style: { 'border-width': 4, 'border-color': '#f1c40f' } },
            {
                selector: ':parent',
                style: {
                    'background-opacity': 0.333, 'background-color': '#e0e0e0',
                    'border-color': '#a0a0a0', 'border-width': 1, 'font-size': 16,
                    'color': '#555', 'text-valign': 'top', 'text-halign': 'center',
                    'padding': '15px', 'label': 'data(id)'
                }
            }
        ]
    });
    
    const showLoader = () => loader.style.display = 'flex';
    const hideLoader = () => loader.style.display = 'none';

    zoomSlider.addEventListener('input', (e) => cy.zoom(parseFloat(e.target.value)));
    
    function reRunLayout() {
        const layoutName = graphLayoutSelect.value;
        const edgeLength = parseInt(edgeLengthSlider.value);
        const nodeSpacing = parseInt(nodeSpacingSlider.value);

        const options = Object.assign({}, layouts[layoutName], {
            idealEdgeLength: edgeLength,
            edgeLength: edgeLength,
            nodeSeparation: nodeSpacing,
            nodeSpacing: nodeSpacing,
            minNodeSpacing: nodeSpacing
        });
        cy.layout(options).run();
    }
    graphLayoutSelect.addEventListener('change', reRunLayout);
    edgeLengthSlider.addEventListener('change', reRunLayout);
    nodeSpacingSlider.addEventListener('change', reRunLayout);
    
    function updateLegend() {
        legendContent.innerHTML = '';
        const displayedLabels = new Set();
        cy.nodes().forEach(node => {
            const label = node.data('label');
            if (label && !displayedLabels.has(label)) {
                displayedLabels.add(label);
                const color = getColorForLabel(label);
                const legendItem = document.createElement('div');
                legendItem.classList.add('legend-item');
                legendItem.innerHTML = `<div class="legend-color-box" style="background-color: ${color};"></div><span>${label}</span>`;
                legendContent.appendChild(legendItem);
            }
        });
    }

    function calculateRelativeSizes() {
        const sizeProperty = currentQuery.mapping?.node_size;
        if (!sizeProperty) {
            cy.nodes().forEach(node => node.data('relative_size', 0.5));
            return;
        }

        const maxSizes = {};
        cy.nodes().forEach(node => {
            const label = node.data('label');
            const size = node.data('size') || 0;
            if (!maxSizes[label] || size > maxSizes[label]) {
                maxSizes[label] = size;
            }
        });

        cy.nodes().forEach(node => {
            const label = node.data('label');
            const size = node.data('size') || 0;
            const maxSize = maxSizes[label];
            if (maxSize > 0) {
                node.data('relative_size', size / maxSize);
            } else {
                node.data('relative_size', 0.5);
            }
        });
    }

    async function fetchDataAndRender(url) {
        showLoader();
        cyContainer.style.opacity = 0.5;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            const addedElements = cy.add(data.graph);
            updateLegend();
    
            populateDataTable(data.records, data.keys);
    
            return addedElements;
        } catch (error) {
            console.error("Failed to fetch graph data:", error);
            populateDataTable([], []);
            return cy.collection();
        } finally {
            hideLoader();
            cyContainer.style.opacity = 1;
        }
    }

    timescaleSlider.addEventListener('input', () => {
        const months = parseInt(timescaleSlider.value);
        timescaleLabel.textContent = `Last ${months} month(s)`;
        loadGraph(currentQuery);
    });

    async function loadGraph(query) {
        currentQuery = query;
        clickedNodesHistory = {};
        updateBreadcrumbTrail();
        try { setActiveQueryKey(query.name); } catch(e) {}
        cy.elements().remove();
        propertiesTitle.textContent = "Properties";
        propertiesPanel.innerHTML = `<p>Click a node or edge to see its properties.</p>`;
        populateDataTable([], []);
        
        const limit = limitInput.value;
        const textSearch = textSearchInput.value;
        const months = parseInt(timescaleSlider.value);

        let searchUrl = SEARCH_API_URL_TEMPLATE.replace('{query_name}', query.name) + `?limit=${limit}&months=${months}`;
        if (textSearch) {
            searchUrl += `&text_search=${encodeURIComponent(textSearch)}`;
        }
        
        await fetchDataAndRender(searchUrl);
        calculateRelativeSizes();
        handleZoom();
        reRunLayout();
        
        document.querySelectorAll('#query-list li').forEach(li => {
            if (li.dataset.queryName === query.name) {
                li.classList.add('active');
                queryTitle.textContent = li.firstChild.textContent.trim();
            } else {
                li.classList.remove('active');
            }
        });
    }

    searchButton.addEventListener('click', () => { if (currentQuery.name) loadGraph(currentQuery); });
    textSearchInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') searchButton.click(); });

    async function populateNav() {
        const response = await fetch(QUERIES_API_URL);
        const queries = await response.json();
        const queryList = document.getElementById('query-list');
        queries.forEach(query => {
            const listItem = document.createElement('li');
            listItem.dataset.queryName = query.name;
            listItem.innerHTML = ` ${query.display_name} <div class="nav-item-desc">${query.description}</div> `;
            listItem.addEventListener('click', () => {
                textSearchInput.value = "";
                loadGraph(query);
            });
            queryList.appendChild(listItem);
        });
        if (queries.length > 0) {
            await loadGraph(queries[0]);
        } else {
            hideLoader();
        }
    }

    function formatPropertyValue(key, value) {
        if (value === null || value === undefined) return 'N/A';
    
        if (key && key.toLowerCase().includes('amount') && typeof value === 'number') {
            return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        }
    
        // Format numbers with commas
        if (typeof value === 'number') {
            return value.toLocaleString('en-US');
        }
    
        // Format date strings to MM/DD/YYYY
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            try {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
            } catch (e) {
                return value; // Return original if parsing fails
            }
        }
    
        return value;
    }
    

    async function showElementProperties(element) {
        const props = await fetchElementProperties(element);
        
        // Reset styles first
        propertiesTitle.style.backgroundColor = 'transparent';
        propertiesTitle.style.color = '#003366';
        propertiesTitle.className = '';
    
        if (!props) {
            propertiesTitle.textContent = "Properties";
            propertiesPanel.innerHTML = `<p>Error loading properties.</p>`;
            return;
        }
    
        const isNode = element.isNode();
        const nodeType = element.data('label');
        const titleText = isNode 
            ? (props[currentQuery.caption_property] || props.name || nodeType) 
            : (nodeType || "Edge Properties");
    
        propertiesTitle.textContent = titleText;
    
        if (isNode && nodeType) {
            const color = getColorForLabel(nodeType);
            propertiesTitle.style.backgroundColor = color;
            propertiesTitle.style.color = getReadableTextColor(color);
            propertiesTitle.className = 'properties-title-styled';
        }
    
        let html = '<ul>';
        for (const [key, value] of Object.entries(props)) {
            html += `<li><strong>${key}:</strong> ${formatPropertyValue(key, value)}</li>`;
        }
        html += '</ul>';
        propertiesPanel.innerHTML = html;
    }
    
    let tapTimeout;
    cy.on('tap', 'node, edge', function(evt) {
        const element = evt.target;
        cy.elements().removeClass('selected');
        element.addClass('selected');
        if(element.isNode()) {
            clearTimeout(tapTimeout);
            tapTimeout = setTimeout(() => showElementProperties(element), 200);
        } else {
            showElementProperties(element);
        }
    });

    cy.on('dbltap', 'node', async function(evt) {
        clearTimeout(tapTimeout);
        const node = evt.target;
        const nodeId = node.id();
        const nodeType = node.data('label');
        const nodeName = node.data(currentQuery.caption_property) || node.data('name');
    
        const existingNodeTypes = Object.keys(clickedNodesHistory);
        const clickedIndex = existingNodeTypes.indexOf(nodeType);
    
        if (clickedIndex > -1) {
            const newHistory = {};
            for (let i = 0; i < clickedIndex; i++) {
                const type = existingNodeTypes[i];
                newHistory[type] = clickedNodesHistory[type];
            }
            clickedNodesHistory = newHistory;
        }
        
        clickedNodesHistory[nodeType] = { id: nodeId, name: nodeName };
        updateBreadcrumbTrail();
    
        const historyParams = Object.entries(clickedNodesHistory)
            .map(([type, nodeInfo]) => `${encodeURIComponent(type)}_node_id=${encodeURIComponent(nodeInfo.id)}`)
            .join('&');
    
        const months = parseInt(timescaleSlider.value);
        let neighborsUrl = NEIGHBORS_API_URL_TEMPLATE.replace('{node_id}', nodeId) 
            + `?limit=10&node_type=${nodeType}&query_key=${encodeURIComponent(document.getElementById('current-query-key')?.value || '')}&months=${months}`;
        
        if (historyParams) {
            neighborsUrl += `&${historyParams}`;
        }
        
        await fetchDataAndRender(neighborsUrl);
        calculateRelativeSizes();
        reRunLayout(); // Re-run the selected layout
        handleZoom();
    });

    async function fetchElementProperties(element) {
        const id = element.id();
        const isNode = element.isNode();
        const url = isNode ? NODE_PROPERTIES_API_URL_TEMPLATE.replace('{node_id}', id) : EDGE_PROPERTIES_API_URL_TEMPLATE.replace('{edge_id}', id);
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch properties for tooltip:", error);
            return null;
        }
    }

    function makeTooltip(element) {
        const ref = element.popperRef();
        const dummyDomEle = document.createElement('div');
        const tip = tippy(dummyDomEle, {
            getReferenceClientRect: ref.getBoundingClientRect,
            trigger: 'manual',
            content: () => {
                const content = document.createElement('div');
                const caption = element.data(currentQuery.caption_property) || element.data('name') || element.data('label');
                content.innerHTML = `<b>${caption}</b><p>Loading properties...</p>`;
                return content;
            },
            onShow: async (instance) => {
                const props = await fetchElementProperties(element);
                const caption = element.data(currentQuery.caption_property) || element.data('name') || element.data('label');
                let content = `<b>${caption}</b>`;
                if (props) {
                    content += '<hr style="margin: 2px 0;"><ul>';
                    for (const [key, value] of Object.entries(props)) {
                        content += `<li style="font-size: 0.8em;"><strong>${key}:</strong> ${value}</li>`;
                    }
                    content += '</ul>';
                } else {
                    content += '<p>No properties found.</p>';
                }
                instance.setContent(content);
            },
            arrow: true,
            placement: 'bottom',
            hideOnClick: false,
            allowHTML: true,
            theme: 'translucent'
        });
        return tip;
    }
    
    cy.on('mouseover', 'node, edge', (evt) => {
        const element = evt.target;
        element.data('tooltip', makeTooltip(element));
        element.data('tooltip').show();
    });
    cy.on('mouseout', 'node, edge', (evt) => {
        const tooltip = evt.target.data('tooltip');
        if(tooltip) {
            tooltip.destroy();
            evt.target.removeData('tooltip');
        }
    });

    // --- Drag-to-Pull-Children Logic with Debugging ---
    let draggedParent = null;
    let dragOffsets = {};

    cy.on('grab', 'node', function(evt) {
        draggedParent = evt.target;
        const parentPos = draggedParent.position();
        console.log(`GRABBED node ${draggedParent.id()} at`, parentPos);
        
        draggedParent.neighborhood('node').forEach(function(neighbor) {
            const neighborPos = neighbor.position();
            dragOffsets[neighbor.id()] = {
                x: neighborPos.x - parentPos.x,
                y: neighborPos.y - parentPos.y
            };
        });
        console.log('Calculated offsets for neighbors:', dragOffsets);
    });

    cy.on('drag', 'node', function(evt) {
        if (draggedParent && draggedParent === evt.target) {
            const parentPos = draggedParent.position();
            console.log(`DRAGGING node ${draggedParent.id()} to`, parentPos);
            
            draggedParent.neighborhood('node').forEach(function(neighbor) {
                const offset = dragOffsets[neighbor.id()];
                if (offset) {
                    const newPos = {
                        x: parentPos.x + offset.x,
                        y: parentPos.y + offset.y
                    };
                    neighbor.position(newPos);
                    console.log(`...moving neighbor ${neighbor.id()} to`, newPos);
                }
            });
        }
    });

    cy.on('free', 'node', function(evt) {
        if (draggedParent && draggedParent === evt.target) {
            console.log(`FREED node ${draggedParent.id()}`);
            draggedParent = null;
            dragOffsets = {};
            console.log('Cleared drag state.');
        }
    });

    const labelThreshold = 1.2;
    const baseNodeFontSize = 12;
    const baseEdgeFontSize = 10;
    const minFontSize = 4;
    
    function handleZoom() {
        const zoom = cy.zoom();
        if (zoom > labelThreshold) {
            cy.elements().addClass('labels-visible');
        } else {
            cy.elements().removeClass('labels-visible');
        }
        cy.nodes().style('font-size', Math.max(minFontSize, baseNodeFontSize / zoom));
        cy.edges().style('font-size', Math.max(minFontSize, baseEdgeFontSize / zoom));
    }
    cy.on('zoom pan', handleZoom);
    
    async function updateHeaderInfo() {
        const response = await fetch(INFO_API_URL);
        const info = await response.json();
        document.getElementById('db-info-span').innerHTML = ` <span>User: ${info.user_name}</span> | <span>Database: ${info.database_name}</span> `;
    }

    async function startApp() {
        showLoader();
        await updateHeaderInfo();
        await populateNav();
    }
    
    startApp();
});

/* ================== TOGGLE EXPANSION PATCH (added by ChatGPT) ==================
   Features:
   - Double‑click on a node toggles its own expansion (expand on first, collapse on second)
   - Only elements added by that node’s expansion are removed on collapse
   - Adds a small UI toggle in the header to enable/disable dbl‑click expansion behavior
   Notes:
   - Works with existing backend endpoints and currentQuery handling in this app.
   ============================================================================== */

(function attachToggleExpansion(cy) {
  if (!cy) return;

  // Create UI toggle (header right side)
  try {
    const header = document.querySelector('.header');
    if (header && !document.getElementById('toggle-dbl-expand')) {
      const toggleWrap = document.createElement('div');
      toggleWrap.style.marginLeft = 'auto';
      toggleWrap.style.display = 'flex';
      toggleWrap.style.alignItems = 'center';
      toggleWrap.style.gap = '8px';

      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '6px';
      label.style.cursor = 'pointer';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = 'toggle-dbl-expand';
      cb.checked = true;

      const span = document.createElement('span');
      span.textContent = 'Dbl‑click toggles neighbors';

      label.appendChild(cb);
      label.appendChild(span);
      toggleWrap.appendChild(label);
      header.appendChild(toggleWrap);
    }
  } catch (e) {
    console.warn('Failed to add toggle UI (non-blocking):', e);
  }

  // Registry: nodeId -> { ids: Set<string> } of elements added by that parent’s expansion
  const expansionRegistry = new Map();

  function isToggleEnabled() {
    const el = document.getElementById('toggle-dbl-expand');
    return !el || el.checked; // default ON if missing
  }

  // Build the same neighbors URL this app already uses in its existing dbltap handler
  function buildNeighborsUrlFor(node) {
    const nodeId   = node.id();
    const nodeType = node.data('label');
    const months   = parseInt(document.getElementById('timescale-slider').value);
    const qkey     = document.getElementById('current-query-key')?.value || '';

    // Keep breadcrumb context the app already maintains
    const history = (window.clickedNodesHistory && typeof window.clickedNodesHistory === 'object')
      ? Object.entries(window.clickedNodesHistory) : [];
    const historyParams = history
      .map(([type, info]) => `${encodeURIComponent(type)}_node_id=${encodeURIComponent(info.id)}`)
      .join('&');

    let url = '/api/nodes/{node_id}/neighbors'.replace('{node_id}', nodeId)
            + `?limit=10&node_type=${encodeURIComponent(nodeType)}&query_key=${encodeURIComponent(qkey)}&months=${months}`;
    if (historyParams) url += `&${historyParams}`;
    return url;
  }

  // Expand: fetch neighbors and mark them as belonging to this parent
  async function expandNode(node) {
    const url = buildNeighborsUrlFor(node);

    // Use the app’s existing fetchDataAndRender so nodes/edges are styled & table/legend update
    const added = await (window.fetchDataAndRender ? window.fetchDataAndRender(url) : null);
    if (!added) return;

    // Mark elements with the parent id so we can collapse later
    const parentId = node.id();
    const ids = new Set();

    added.forEach(ele => {
      try {
        ele.data('_expanded_by', parentId);
        ids.add(ele.id());
      } catch (_) {}
    });

    // Keep also any pre-existing neighbors created by this fetch (Cytoscape may merge duplicates)
    // Grab immediate neighborhood of the parent that was just created/updated
    node.neighborhood().forEach(ele => {
      if (ele.data && ele.data('_expanded_by') === parentId) {
        ids.add(ele.id());
      }
    });

    expansionRegistry.set(parentId, { ids });
    node.data('expanded', true);
  }

  // Collapse: remove only edges added by this parent; then remove nodes that become isolated
  function collapseNode(node) {
    const parentId = node.id();
    const record = expansionRegistry.get(parentId);
    if (!record) {
      node.data('expanded', false);
      return;
    }
    const toRemoveEdges = [];
    const toRemoveNodes = [];

    // Remove edges first
    record.ids.forEach(id => {
      const ele = cy.getElementById(id);
      if (ele.nonempty() && ele.isEdge() && ele.data('_expanded_by') === parentId) {
        toRemoveEdges.push(ele);
      }
    });
    cy.remove(cy.collection(toRemoveEdges));

    // Remove nodes that were added by this parent AND are now disconnected
    record.ids.forEach(id => {
      const ele = cy.getElementById(id);
      if (
        ele.nonempty() && ele.isNode() &&
        ele.data('_expanded_by') === parentId &&
        ele.connectedEdges().length === 0
      ) {
        toRemoveNodes.push(ele);
      }
    });
    cy.remove(cy.collection(toRemoveNodes));

    expansionRegistry.delete(parentId);
    node.data('expanded', false);
  }

  // Rebind dbltap: first clear any existing to avoid double-handling
  cy.off('dbltap', 'node');
  cy.on('dbltap', 'node', async function(evt) {
    if (!isToggleEnabled()) return;

    // Avoid the single-tap property panel
    if (typeof window.tapTimeout !== 'undefined') {
      clearTimeout(window.tapTimeout);
    }

    const node = evt.target;
    const already = !!node.data('expanded');

    if (already) {
      collapseNode(node);
    } else {
      await expandNode(node);
    }

    // Rerun layout & keep zoom behavior consistent with the rest of the app
    if (typeof window.calculateRelativeSizes === 'function') window.calculateRelativeSizes();
    if (typeof window.reRunLayout === 'function') window.reRunLayout();
    if (typeof window.handleZoom === 'function') window.handleZoom();
  });

  // Optional: expose helpers for debugging from console
  window.__toggleExpansion = { expansionRegistry, expandNode, collapseNode };
})(window.cy);
/* ================= END TOGGLE EXPANSION PATCH ================= */
