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

'shape': (ele) => getShapeForLabel(ele.data('label')),



  cy.on('dbltap', 'node', async function (evt) {
        clearTimeout(tapTimeout);
        const node = evt.target;
        const nodeId = node.id();
        const nodeType = node.data('label');
        // Fetch neighbour data and add to the graph without clearing existing elements.
        const neighborsUrl = NEIGHBORS_API_URL_TEMPLATE.replace('{node_id}', nodeId) + `?limit=15&node_type=${nodeType}`;
        const newElements = await fetchDataAndRender(neighborsUrl);
        calculateRelativeSizes();
        // Rather than re-running a global layout (which causes the entire graph to reload),
        // apply the current layout only to the newly-added elements.  Do not fit the
        // overall graph again so the current view remains stable.
        if (newElements && newElements.length > 0) {
            const layoutName = graphLayoutSelect.value;
            const layoutOptions = {
                name: layoutName,
                animate: true,
                padding: 50,
                fit: false,
                idealEdgeLength: parseInt(edgeLengthSlider.value),
                nodeSeparation: parseInt(nodeSpacingSlider.value),
                nodeSpacing: parseInt(nodeSpacingSlider.value),
                spacingFactor: 1.5,
                nodeOverlap: 20
            };
            newElements.layout(layoutOptions).run();
        }
    });
