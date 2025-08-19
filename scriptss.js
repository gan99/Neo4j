let neoViz;

function draw(query) {
    const config = {
        containerId: "viz",
        neo4j: {
            serverUrl: "bolt://localhost:7687",
            serverUser: "neo4j",
            serverPassword: "ganesh1298",
        },
        visConfig: {
            nodes: {
                shape: 'dot',
                size: 20,
                font: {
                    size: 14, 
                },
                scaling: {
                    min: 10,
                    max: 50
                },
                color: {
                    background: '#97C2FC',
                    borderWidth: 2
                }
            },
            edges: {
                arrows: {
                    to: { enabled: true }
                }
            },
            physics: {
                stabilization: false 
            }
        },
        labels: {
            Account: {
                label: "name",
                value: "id",
                [NeoVis.NEOVIS_ADVANCED_CONFIG]: {
                    function: {
                        label: (node) => `Acc: ${node.properties.id}\n Name: ${node.properties.name}`
                    }
                }
            },
            Transaction: {
                label: "amount",
                value: "id",
                group: "type",
                [NeoVis.NEOVIS_ADVANCED_CONFIG]: {
                    function: {
                        label: (node) => `Txn ID: ${node.properties.id}\n Amount: $${node.properties.amount}`
                    }
                }
            }
        },
        relationships: {
            INITIATED: {
                value: "weight",
                [NeoVis.NEOVIS_ADVANCED_CONFIG]: {
                    function: {
                        label: (relationship) => `Type: ${relationship.type}`
                    }
                }
            },
            SENT_TO: {
                value: "weight",
                [NeoVis.NEOVIS_ADVANCED_CONFIG]: {
                    function: {
                        label: (relationship) => `Type: ${relationship.type}`
                    }
                }
            }
        },
        initialCypher: query
    };

    neoViz = new NeoVis.default(config);
    neoViz.render();
}

function setActiveButton(button) {
    const buttons = document.querySelectorAll('.filters button');
    buttons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

function filterNodes(label) {
    const nodeLimit = document.getElementById("nodeLimit").value;
    const query = `MATCH (n:${label}) RETURN n LIMIT ${nodeLimit}`;
    draw(query);
    setActiveButton(event.target);
}

function filterRelationships(type) {
    const nodeLimit = document.getElementById("nodeLimit").value;
    const query = `MATCH p=()-[r:${type}]->() RETURN p LIMIT ${nodeLimit}`;
    draw(query);
    setActiveButton(event.target);
}

function resetVisualization() {
    draw("MATCH p=()-[r]->() RETURN p LIMIT 100");  
    const buttons = document.querySelectorAll('.filters button');
    buttons.forEach(btn => btn.classList.remove('active'));
}

function searchNode() {
    const nodeLimit = document.getElementById("nodeLimit").value;
    const searchInput = document.getElementById("searchInput").value.trim().toLowerCase();

    if (searchInput === "") {
        alert("Please enter a value to search.");
        return;
    }

    let query = `
        MATCH (n)-[r]-(m)
        WHERE toLower(n.name) CONTAINS "${searchInput}" 
           OR toString(n.id) = "${searchInput}" 
           OR toString(n.amount) = "${searchInput}"
        RETURN n, r, m
        LIMIT ${nodeLimit}
    `;

    draw(query);
}

function stabilizeGraph() {
    if (neoViz && neoViz.network) {
        neoViz.network.stopSimulation();
    }
}

window.draw = draw;


draw("MATCH p=()-[r]->() RETURN p LIMIT 100");
