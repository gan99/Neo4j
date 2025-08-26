# --- Dataiku Webapp Backend (Flask) ---
import json
import dataiku
from dataiku import webapp
from flask import request, jsonify
from neo4j import GraphDatabase

# ====== Load Neo4j credentials from DSS Secrets ======
def _get_secret_map():
    client = dataiku.api_client()
    auth = client.get_auth_info(with_secrets=True)
    secrets = {s["key"]: s["value"] for s in auth.get("secrets", [])}
    return secrets

SECRETS = _get_secret_map()
NEO4J_URI = SECRETS.get("neo4j_uri")
NEO4J_USER = SECRETS.get("neo4j_user")
NEO4J_PWD  = SECRETS.get("neo4j_password")

if not all([NEO4J_URI, NEO4J_USER, NEO4J_PWD]):
    raise RuntimeError("Neo4j credentials not found in DSS Secrets (neo4j_uri, neo4j_user, neo4j_password).")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PWD))

# ====== Helpers to build vis-network nodes/edges ======
def add_node(nodes_dict, node_id, label, group, title=None, color=None):
    if node_id not in nodes_dict:
        nd = {"id": node_id, "label": label, "group": group}
        if title: nd["title"] = title
        if color: nd["color"] = color
        nodes_dict[node_id] = nd

def add_edge(edges_list, src, tgt, label=None, width=None, color=None, dashes=False):
    ed = {"from": src, "to": tgt}
    if label is not None: ed["label"] = str(label)
    if width is not None: ed["width"] = float(width)
    if color is not None: ed["color"] = color
    if dashes: ed["dashes"] = True
    edges_list.append(ed)

# ====== Default Cypher (focus on Party↔Party; then attach each Party’s FI) ======
DEFAULT_CYPHER = """
MATCH (p:Party)-[r:INTERACTS]-(q:Party)
WHERE id(p) < id(q)
OPTIONAL MATCH (p)-[rc1:CONNECTED_TO_FI|IS_CUSTOMER_OF]->(fi1:FinancialInstitution)
OPTIONAL MATCH (q)-[rc2:CONNECTED_TO_FI|IS_CUSTOMER_OF]->(fi2:FinancialInstitution)
RETURN  id(p)  AS p_id,  p.party_name  AS p_name,
        id(q)  AS q_id,  q.party_name  AS q_name,
        r.total_amount AS total_amount, r.count AS tx_count,
        id(fi1) AS fi1_id, fi1.fi_name_std AS fi1_name,
        id(fi2) AS fi2_id, fi2.fi_name_std AS fi2_name,
        rc1.isBMO AS p_is_bmo, rc2.isBMO AS q_is_bmo
ORDER BY total_amount DESC
LIMIT 300
"""

app = webapp.app  # Dataiku-provided Flask app

@app.route("/api/graph", methods=["POST"])
def api_graph():
    """
    Body JSON:
    {
      "cypher": "...optional custom cypher...",
      "params": {... optional neo4j params ...}
    }
    """
    body = request.get_json(force=True, silent=True) or {}
    cypher = body.get("cypher", DEFAULT_CYPHER)
    params = body.get("params", {})

    nodes = {}
    edges = []

    with driver.session() as session:
        result = session.run(cypher, **params)
        for rec in result:
            # Parties
            p_id = rec["p_id"]; p_name = rec.get("p_name") or f"Party {p_id}"
            q_id = rec["q_id"]; q_name = rec.get("q_name") or f"Party {q_id}"

            # Relationship metrics
            total_amount = rec.get("total_amount")
            tx_count     = rec.get("tx_count")

            # FIs (optional)
            fi1_id   = rec.get("fi1_id")
            fi1_name = rec.get("fi1_name")
            fi2_id   = rec.get("fi2_id")
            fi2_name = rec.get("fi2_name")

            # BMO flags (optional, when you created CONNECTED_TO_FI with isBMO)
            p_is_bmo = rec.get("p_is_bmo")
            q_is_bmo = rec.get("q_is_bmo")

            # Add Party nodes (color parties; optionally bold if linked to BMO)
            add_node(nodes, p_id, p_name, group="Party",
                     title=f"Party\nID: {p_id}\nBMO: {p_is_bmo}",
                     color=("#1f77b4" if not p_is_bmo else "#000000"))  # black for BMO, blue otherwise
            add_node(nodes, q_id, q_name, group="Party",
                     title=f"Party\nID: {q_id}\nBMO: {q_is_bmo}",
                     color=("#1f77b4" if not q_is_bmo else "#000000"))

            # Add Party↔Party edge; width ~ total_amount (scaled)
            width = None
            if total_amount is not None:
                try:
                    width = max(1.0, float(total_amount) ** 0.25)  # gentle scaling to avoid huge lines
                except:
                    width = None

            edge_label = f"${total_amount:,.0f} / {tx_count} tx" if (total_amount is not None and tx_count is not None) \
                         else (f"{tx_count} tx" if tx_count is not None else None)
            add_edge(edges, p_id, q_id, label=edge_label, width=width)

            # Attach each Party's FI only if present; color FIs orange; set dashed edges for FI links
            if fi1_id is not None:
                add_node(nodes, fi1_id, fi1_name or f"FI {fi1_id}", group="FinancialInstitution", color="#ff7f0e")
                add_edge(edges, p_id, fi1_id, label="FI", dashes=True)
            if fi2_id is not None:
                add_node(nodes, fi2_id, fi2_name or f"FI {fi2_id}", group="FinancialInstitution", color="#ff7f0e")
                add_edge(edges, q_id, fi2_id, label="FI", dashes=True)

    return jsonify({
        "nodes": list(nodes.values()),
        "edges": edges
    })
