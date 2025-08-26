import dataiku
from flask import request
from neo4j import GraphDatabase

# Replace with your Neo4j connection details from the preset
uri = "bolt://<your_neo4j_uri>:7687"
user = "neo4j"
password = "<your_password>"
driver = GraphDatabase.driver(uri, auth=(user, password))

@app.route('/get_graph_data')
def get_graph_data():
    cypher_query = request.args.get('query', 'MATCH (n)-[r]-(m) RETURN n,r,m LIMIT 50')
    data = {'nodes': [], 'edges': []}
    try:
        with driver.session() as session:
            result = session.run(cypher_query)
            for record in result:
                # Logic to parse Neo4j records into a format for vis.js/Neovis.js
                # Example: `data['nodes'].append(...)`, `data['edges'].append(...)`
                pass # Replace with actual parsing logic
    except Exception as e:
        return {'error': str(e)}, 500

    return json.dumps(data)
