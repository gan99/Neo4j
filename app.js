// app/static/app.js
//
// This file replaces the previous Cytoscape implementation with a D3.js based
// renderer.  It implements an interactive graph that supports force‑directed
// layouts, optional circle or tree layouts, node sizing, colouring and
// expanding neighbours on double click.  The UI retains the search bar,
// layout selectors, sliders, legend and properties panel from the original
// application.

document.addEventListener('DOMContentLoaded', function () {
    /*** API Endpoints and global state ***/
    const INFO_API_URL = '/api/connection-info';
    const QUERIES_API_URL = '/api/queries';
    const SEARCH_API_URL_TEMPLATE = '/api/search/{query_name}';
    const NEIGHBORS_API_URL_TEMPLATE = '/api/nodes/{node_id}/neighbors';
    const NODE_PROPERTIES_API_URL_TEMPLATE = '/api/nodes/{node_id}/properties';
    const EDGE_PROPERTIES_API_URL_TEMPLATE = '/api/edges/{edge_id}/properties';

    // UI elements
    const cyContainer = document.getElementById('cy');
    const loader = document.getElementById('loader');
    const propertiesPanel = document.getElementById('properties-panel');
    const propertiesTitle = document.getElementById('properties-title');
    const zoomSlider = document.getElementById('zoom-slider');
    const edgeLengthSlider = document.getElementById('edge-length-slider');
    const nodeSpacingSlider = document.getElementById('node-spacing-slider');
    const graphLayoutSelect = document.getElementById('graph-layout-select');
    const legendContent = document.getElementById('legend-content');
    const queryTitle = document.getElementById('query-title');
    const textSearchInput = document.getElementById('text-search-input');
    const limitInput = document.getElementById('limit-input');
    const searchButton = document.getElementById('search-button');

    let currentQuery = {};

    /*** Colour and shape utilities ***/
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
    // Define custom shapes for each node label.  Shapes are later rendered via
    // SVG primitives (circle, rect, polygon).
    const nodeShapeMap = {
        Party: 'ellipse',
        Transaction: 'diamond',
        Account: 'rectangle',
        FinancialInstitution: 'round-rectangle',
        PaymentProduct: 'hexagon',
        AccountProduct: 'triangle'
    };
    function getShapeForLabel(label) {
        return nodeShapeMap[label] || 'ellipse';
    }

    /*** Graph data structures ***/
    let nodes = [];
    let links = [];
    const nodesMap = new Map();
    const linksMap = new Map();

    /*** D3 SVG setup ***/
    const width = cyContainer.clientWidth;
    const height = cyContainer.clientHeight;
    const svg = d3.select(cyContainer).append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('class', 'graph-canvas');
    // Group that is zoomed and panned
    const g = svg.append('g');

    // Zoom behaviour: update transform on zoom and synchronise slider
    const zoomBehaviour = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
            // Update slider without triggering 'input' listener
            zoomSlider.value = event.transform.k.toFixed(2);
            updateLabelVisibility();
        });
    svg.call(zoomBehaviour);

    // Force simulation for force layouts
    let simulation = d3.forceSimulation()
        .force('link', d3.forceLink().id(d => d.id).distance(() => parseInt(edgeLengthSlider.value)))
        .force('charge', d3.forceManyBody().strength(() => -3 * parseInt(nodeSpacingSlider.value)))
        .force('center', d3.forceCenter(width / 2, height / 2));

    /*** Utility functions for showing/hiding loader ***/
    const showLoader = () => loader.style.display = 'flex';
    const hideLoader = () => loader.style.display = 'none';

    /*** Update zoom slider when user zooms via slider ***/
    zoomSlider.addEventListener('input', (e) => {
        const newScale = parseFloat(e.target.value);
        // Smoothly zoom to the desired scale; the second argument is the
        // transition duration in milliseconds.
        svg.transition().duration(0).call(zoomBehaviour.scaleTo, newScale);
    });

    /*** Sliders adjusting link distance and node repulsion ***/
    edgeLengthSlider.addEventListener('change', () => {
        const distance = parseInt(edgeLengthSlider.value);
        simulation.force('link').distance(distance);
        if (isForceLayout()) {
            simulation.alpha(1).restart();
        }
    });
    nodeSpacingSlider.addEventListener('change', () => {
        const strength = -3 * parseInt(nodeSpacingSlider.value);
        simulation.force('charge').strength(strength);
        if (isForceLayout()) {
            simulation.alpha(1).restart();
        }
    });

    /*** Determines if the current layout is a force‑based layout ***/
    function isForceLayout() {
        const layout = graphLayoutSelect.value;
        return layout === 'cola' || layout === 'fcose' || layout === 'force' || layout === 'force-directed';
    }

    /*** Shape path helper functions ***/
    function createShape(selection, d) {
        // Clear any previous shape
        selection.selectAll('*').remove();
        const size = 8 + (d.relative_size || 0.5) * 20;
        const color = getColorForLabel(d.label);
        const shape = d.shape || getShapeForLabel(d.label);
        switch (shape) {
            case 'ellipse':
                selection.append('circle')
                    .attr('r', size)
                    .attr('fill', color);
                break;
            case 'diamond': {
                const points = [
                    [0, -size],
                    [size, 0],
                    [0, size],
                    [-size, 0]
                ];
                selection.append('polygon')
                    .attr('points', points.map(p => p.join(',')).join(' '))
                    .attr('fill', color);
                break;
            }
            case 'rectangle': {
                const w = size * 1.8;
                const h = size * 1.2;
                selection.append('rect')
                    .attr('x', -w / 2)
                    .attr('y', -h / 2)
                    .attr('width', w)
                    .attr('height', h)
                    .attr('fill', color);
                break;
            }
            case 'round-rectangle': {
                const w = size * 1.8;
                const h = size * 1.2;
                const r = Math.min(w, h) * 0.3;
                selection.append('rect')
                    .attr('x', -w / 2)
                    .attr('y', -h / 2)
                    .attr('width', w)
                    .attr('height', h)
                    .attr('rx', r)
                    .attr('ry', r)
                    .attr('fill', color);
                break;
            }
            case 'hexagon': {
                const p = [];
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i + Math.PI / 6;
                    p.push([size * Math.cos(angle), size * Math.sin(angle)]);
                }
                selection.append('polygon')
                    .attr('points', p.map(pt => pt.join(',')).join(' '))
                    .attr('fill', color);
                break;
            }
            case 'triangle': {
                const points = [
                    [0, -size],
                    [size, size],
                    [-size, size]
                ];
                selection.append('polygon')
                    .attr('points', points.map(p => p.join(',')).join(' '))
                    .attr('fill', color);
                break;
            }
            default:
                // Default to circle
                selection.append('circle')
                    .attr('r', size)
                    .attr('fill', color);
        }
        // Optional border for selection highlighting; border colour is set via CSS
        selection.attr('stroke-width', 0);
    }

    /*** Legend update ***/
    function updateLegend() {
        legendContent.innerHTML = '';
        const displayedLabels = new Set();
        nodes.forEach(node => {
            const label = node.label;
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

    /*** Relative size calculation ***/
    function calculateRelativeSizes() {
        const sizeProperty = currentQuery.mapping?.node_size;
        if (!sizeProperty) {
            nodes.forEach(node => node.relative_size = 0.5);
            return;
        }
        const maxSizes = {};
        nodes.forEach(node => {
            const label = node.label;
            const size = node.size || 0;
            if (!maxSizes[label] || size > maxSizes[label]) {
                maxSizes[label] = size;
            }
        });
        nodes.forEach(node => {
            const maxSize = maxSizes[node.label] || 0;
            const val = node.size || 0;
            if (maxSize > 0) {
                node.relative_size = val / maxSize;
            } else {
                node.relative_size = 0.5;
            }
        });
    }

    /*** Label visibility based on zoom scale ***/
    const labelThreshold = 1.2;
    function updateLabelVisibility() {
        const transform = d3.zoomTransform(svg.node());
        const scale = transform.k;
        g.selectAll('text.node-label')
            .style('opacity', scale > labelThreshold ? 1 : 0);
    }

    /*** Graph rendering ***/
    function updateGraph() {
        // Bind edges
        const linkSel = g.selectAll('line.link').data(links, d => d.id);
        linkSel.enter()
            .append('line')
            .attr('class', 'link')
            .attr('stroke', '#ccc')
            .attr('stroke-width', d => Math.min(Math.max(d.weight || 1, 1), 10))
            .merge(linkSel)
            .attr('stroke-width', d => Math.min(Math.max(d.weight || 1, 1), 10));
        linkSel.exit().remove();

        // Bind nodes
        const nodeSel = g.selectAll('g.node').data(nodes, d => d.id);
        const nodeEnter = nodeSel.enter()
            .append('g')
            .attr('class', 'node')
            .on('click', (event, d) => {
                // Highlight selection
                g.selectAll('g.node').classed('selected', false);
                d3.select(event.currentTarget).classed('selected', true);
                clearTimeout(tapTimeout);
                tapTimeout = setTimeout(() => showElementProperties(d), 200);
            })
            .on('dblclick', (event, d) => {
                clearTimeout(tapTimeout);
                expandNode(d);
            })
            .on('mouseover', (event, d) => {
                showTooltip(event.currentTarget, d);
            })
            .on('mouseout', (event, d) => {
                hideTooltip(d);
            })
            .call(d3.drag()
                .on('start', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }));
        // Create shape for new nodes
        nodeEnter.each(function (d) {
            const shapeGroup = d3.select(this).append('g');
            createShape(shapeGroup, d);
        });
        // Add labels for new nodes
        nodeEnter.append('text')
            .attr('class', 'node-label')
            .attr('text-anchor', 'middle')
            .attr('dy', 4)
            .style('pointer-events', 'none')
            .text(d => d[currentQuery.caption_property] || d.name || '');
        nodeSel.exit().remove();
        // Update label text for existing nodes if caption property changed
        nodeSel.select('text.node-label')
            .text(d => d[currentQuery.caption_property] || d.name || '');

        // Start simulation for force layout only
        if (isForceLayout()) {
            simulation.nodes(nodes).on('tick', ticked);
            simulation.force('link').links(links);
            simulation.alpha(1).restart();
        }
        updateLegend();
        updateLabelVisibility();
    }

    // Tick handler to update positions of nodes and links during force simulation
    function ticked() {
        g.selectAll('line.link')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        g.selectAll('g.node')
            .attr('transform', d => `translate(${d.x},${d.y})`);
    }

    /*** Parsing server results and merging into graph ***/
    function parseElements(elements, anchorNode) {
        const newNodes = [];
        const newLinks = [];
        elements.forEach(el => {
            const data = el.data;
            if (data.source && data.target) {
                // Edge
                const id = data.id;
                if (!linksMap.has(id)) {
                    // Ensure we refer to existing node objects when setting source/target
                    const link = {
                        id,
                        source: data.source,
                        target: data.target,
                        label: data.label
                    };
                    if ('weight' in data) link.weight = data.weight;
                    links.push(link);
                    linksMap.set(id, link);
                    newLinks.push(link);
                }
            } else {
                // Node
                const id = data.id;
                if (!nodesMap.has(id)) {
                    const node = Object.assign({}, data, { id: id, label: data.label || 'Node' });
                    // relative_size will be computed later; shape set later
                    nodes.push(node);
                    nodesMap.set(id, node);
                    newNodes.push(node);
                }
            }
        });
        // Position newly added nodes near the anchor node if specified
        if (anchorNode && newNodes.length > 0) {
            const radius = Math.max(parseInt(edgeLengthSlider.value), 50);
            const angleStep = (2 * Math.PI) / newNodes.length;
            let idx = 0;
            newNodes.forEach(n => {
                if (n.id === anchorNode.id) return;
                const angle = angleStep * idx;
                n.x = anchorNode.x + radius * Math.cos(angle);
                n.y = anchorNode.y + radius * Math.sin(angle);
                idx++;
            });
        }
        return newNodes;
    }

    /*** Fetch graph data and render it.  Optionally anchor new nodes around a node. ***/
    async function fetchDataAndRender(url, anchorNode) {
        showLoader();
        cyContainer.style.opacity = 0.5;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const newNodes = parseElements(data, anchorNode);
            // After adding raw nodes, compute shapes and relative sizes
            nodes.forEach(n => { n.shape = getShapeForLabel(n.label); });
            calculateRelativeSizes();
            updateGraph();
            return newNodes;
        } catch (error) {
            console.error('Failed to fetch graph data:', error);
            return [];
        } finally {
            hideLoader();
            cyContainer.style.opacity = 1;
        }
    }

    /*** Load a complete graph for a query ***/
    async function loadGraph(query) {
        currentQuery = query;
        // Reset data structures
        nodes = [];
        links = [];
        nodesMap.clear();
        linksMap.clear();
        propertiesTitle.textContent = 'Properties';
        propertiesPanel.innerHTML = '<p>Click a node or edge to see its properties.</p>';

        const limit = limitInput.value;
        const textSearch = textSearchInput.value;
        let searchUrl = SEARCH_API_URL_TEMPLATE.replace('{query_name}', query.name) + `?limit=${limit}`;
        if (textSearch) searchUrl += `&text_search=${encodeURIComponent(textSearch)}`;
        await fetchDataAndRender(searchUrl);
        // Determine layout initialisation: for force layout, restart simulation; for others compute positions
        applyLayout();
        // Update nav highlighting and query title
        document.querySelectorAll('#query-list li').forEach(li => {
            if (li.dataset.queryName === query.name) {
                li.classList.add('active');
                queryTitle.textContent = li.firstChild.textContent.trim();
            } else {
                li.classList.remove('active');
            }
        });
    }

    /*** Apply layout according to selection ***/
    function applyLayout() {
        const layoutName = graphLayoutSelect.value;
        if (layoutName === 'circle' || layoutName === 'concentric') {
            // Position nodes on a circle
            simulation.stop();
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2.5;
            nodes.forEach((node, i) => {
                const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1);
                node.x = centerX + radius * Math.cos(angle);
                node.y = centerY + radius * Math.sin(angle);
            });
            updateGraph();
        } else if (layoutName === 'breadthfirst') {
            // Simple tree layout based on breadth‑first levels
            simulation.stop();
            treeLayout();
        } else {
            // Force layout for 'cola', 'fcose' or unknown layouts
            simulation.alpha(1).restart();
        }
    }

    /*** Simple breadth‑first tree layout ***/
    function treeLayout() {
        if (nodes.length === 0) return;
        const root = nodes[0];
        const levels = {};
        const visited = new Set();
        const queue = [];
        levels[root.id] = 0;
        visited.add(root.id);
        queue.push(root);
        // Build adjacency map of node IDs
        const adj = {};
        nodes.forEach(n => { adj[n.id] = []; });
        links.forEach(l => {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            const t = typeof l.target === 'object' ? l.target.id : l.target;
            adj[s].push(t);
            adj[t].push(s);
        });
        while (queue.length) {
            const curr = queue.shift();
            const lvl = levels[curr.id];
            adj[curr.id].forEach(nId => {
                if (!visited.has(nId)) {
                    visited.add(nId);
                    levels[nId] = lvl + 1;
                    queue.push(nodesMap.get(nId));
                }
            });
        }
        const maxLevel = Math.max(...Object.values(levels));
        // Group node IDs by level
        const layerMap = {};
        Object.keys(levels).forEach(nId => {
            const lvl = levels[nId];
            if (!layerMap[lvl]) layerMap[lvl] = [];
            layerMap[lvl].push(nId);
        });
        const layerWidth = width / (maxLevel + 1);
        Object.keys(layerMap).forEach(lvlStr => {
            const lvl = parseInt(lvlStr);
            const ids = layerMap[lvl];
            const y = ((lvl + 0.5) / (maxLevel + 1)) * height;
            ids.forEach((id, i) => {
                const x = (lvl + 0.5) * layerWidth + (i - (ids.length - 1) / 2) * 40;
                const node = nodesMap.get(id);
                node.x = x;
                node.y = y;
            });
        });
        updateGraph();
    }

    /*** Expand node to show neighbours ***/
    function expandNode(node) {
        const nodeId = node.id;
        const nodeType = node.label;
        const querySetParam = currentQuery.name ? `&query_set_name=${encodeURIComponent(currentQuery.name)}` : '';
        const neighborsUrl = NEIGHBORS_API_URL_TEMPLATE.replace('{node_id}', nodeId) + `?limit=15&node_type=${nodeType}${querySetParam}`;
        fetchDataAndRender(neighborsUrl, node).then(() => {
            applyLayout();
        });
    }

    /*** Fetch and show properties in the right panel ***/
    async function showElementProperties(elem) {
        const isNode = !('source' in elem && 'target' in elem);
        const url = isNode ? NODE_PROPERTIES_API_URL_TEMPLATE.replace('{node_id}', elem.id) : EDGE_PROPERTIES_API_URL_TEMPLATE.replace('{edge_id}', elem.id);
        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('Failed to fetch properties');
            const props = await resp.json();
            propertiesTitle.textContent = isNode ? (props[currentQuery.caption_property] || props.name || 'Node Properties') : (elem.label || 'Edge Properties');
            let html = '<ul>';
            for (const [key, value] of Object.entries(props)) {
                html += `<li><strong>${key}:</strong> ${value}</li>`;
            }
            html += '</ul>';
            propertiesPanel.innerHTML = html;
        } catch (err) {
            propertiesTitle.textContent = 'Properties';
            propertiesPanel.innerHTML = '<p>Error loading properties.</p>';
        }
    }

    /*** Tooltip handling using tippy.js.  For each node or edge we attach a manual
     *  tippy instance on mouseover and destroy it on mouseout. ***/
    const activeTooltips = new Map();
    function showTooltip(elementNode, data) {
        // Avoid multiple tooltips on the same element
        hideTooltip(data);
        const caption = data[currentQuery.caption_property] || data.name || data.label;
        const dummy = document.createElement('div');
        const tip = tippy(dummy, {
            getReferenceClientRect: () => elementNode.getBoundingClientRect(),
            trigger: 'manual',
            content: () => {
                const div = document.createElement('div');
                div.innerHTML = `<b>${caption}</b><p>Loading properties...</p>`;
                return div;
            },
            allowHTML: true,
            arrow: true,
            placement: 'bottom',
            hideOnClick: false,
            theme: 'translucent'
        });
        tip.show();
        activeTooltips.set(data.id, tip);
        // Fetch properties to enrich tooltip
        fetchElementProperties(data).then(props => {
            let content = `<b>${caption}</b>`;
            if (props) {
                content += '<hr style="margin: 2px 0;"><ul>';
                for (const [k, v] of Object.entries(props)) {
                    content += `<li style="font-size: 0.8em;"><strong>${k}:</strong> ${v}</li>`;
                }
                content += '</ul>';
            } else {
                content += '<p>No properties found.</p>';
            }
            tip.setContent(content);
        });
    }
    function hideTooltip(data) {
        const tip = activeTooltips.get(data.id);
        if (tip) {
            tip.destroy();
            activeTooltips.delete(data.id);
        }
    }
    async function fetchElementProperties(elem) {
        const isNode = !('source' in elem && 'target' in elem);
        const url = isNode ? NODE_PROPERTIES_API_URL_TEMPLATE.replace('{node_id}', elem.id) : EDGE_PROPERTIES_API_URL_TEMPLATE.replace('{edge_id}', elem.id);
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch properties for tooltip:', error);
            return null;
        }
    }

    /*** Populate the navigation list with available queries ***/
    async function populateNav() {
        try {
            const response = await fetch(QUERIES_API_URL);
            const queries = await response.json();
            const queryList = document.getElementById('query-list');
            queryList.innerHTML = '';
            queries.forEach(query => {
                const li = document.createElement('li');
                li.dataset.queryName = query.name;
                li.innerHTML = ` ${query.display_name} <div class="nav-item-desc">${query.description}</div> `;
                li.addEventListener('click', () => {
                    textSearchInput.value = '';
                    loadGraph(query);
                });
                queryList.appendChild(li);
            });
            if (queries.length > 0) {
                await loadGraph(queries[0]);
            } else {
                hideLoader();
            }
        } catch (err) {
            console.error('Failed to populate queries:', err);
            hideLoader();
        }
    }

    /*** Update header with user and database info ***/
    async function updateHeaderInfo() {
        try {
            const response = await fetch(INFO_API_URL);
            const info = await response.json();
            document.getElementById('db-info-span').innerHTML = ` <span>User: ${info.user_name}</span> | <span>Database: ${info.database_name}</span> `;
        } catch (err) {
            console.error('Failed to fetch connection info:', err);
        }
    }

    /*** Search button handler ***/
    searchButton.addEventListener('click', () => {
        if (currentQuery.name) loadGraph(currentQuery);
    });
    textSearchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') searchButton.click();
    });

    /*** Layout selector change handler ***/
    graphLayoutSelect.addEventListener('change', applyLayout);

    // Handle zoom/pan events to update slider and label visibility on initial load
    svg.call(zoomBehaviour);

    /*** Kick off the app ***/
    async function startApp() {
        showLoader();
        await updateHeaderInfo();
        await populateNav();
    }
    let tapTimeout;
    startApp();
});