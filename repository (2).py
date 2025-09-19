# backend.py — DSS Code Webapp (Python) backend

import logging
import yaml
from flask import request, jsonify
import dataiku

# ---- import your project libraries ----
from udm_app.config import settings          # pydantic settings object you created
from udm_app.db import get_driver            # your Neo4j driver factory (singleton)
from udm_app.repository import GraphRepository

logger = logging.getLogger(__name__)

# ---- 1) Read DSS secrets securely and override settings ----
def _read_dss_secrets():
    client = dataiku.api_client()
    info = client.get_auth_info(with_secrets=True) or {}
    secrets_list = info.get("secrets", []) or []
    return {s.get("key"): s.get("value") for s in secrets_list if "key" in s}

SECRETS = _read_dss_secrets()
for k in ("neo4j_uri", "neo4j_user", "neo4j_password", "neo4j_database"):
    if SECRETS.get(k):
        setattr(settings, k, SECRETS[k])

# ---- 2) Init Neo4j driver (uses settings we just overridden) ----
driver = get_driver()

# ---- 3) Load queries.yaml from Managed Folder ----
QUERIES_FOLDER_ID = "I7CQQmMN"   # <-- your folder ID

def load_queries_from_folder():
    folder = dataiku.Folder(QUERIES_FOLDER_ID)
    with folder.get_download_stream("queries.yaml") as f:
        return yaml.safe_load(f)

# Build repository and inject queries from folder (overrides file path)
repo = GraphRepository(driver)
try:
    repo.query_sets = load_queries_from_folder()
    logger.info("Loaded queries.yaml from Managed Folder %s", QUERIES_FOLDER_ID)
except Exception:
    logger.exception("Failed to load queries.yaml from Managed Folder; using repo defaults.")

# ============================================================
# Flask routes (DSS provides `app`)
# ============================================================

@app.route('/api/connection-info', methods=['GET'])
def connection_info():
    return jsonify({
        "user_name": settings.neo4j_user,
        "database_name": settings.neo4j_database
    })

@app.route('/api/queries', methods=['GET'])
def list_queries():
    try:
        return jsonify(repo.get_available_queries())
    except Exception:
        logger.exception("Error listing queries")
        return jsonify({"error": "Failed to list queries"}), 500

@app.route('/api/search/<query_set_name>', methods=['GET'])
def search(query_set_name):
    try:
        # all query params pass straight through (limit, text_search, months, etc.)
        params = dict(request.args)
        params.setdefault("months", 1)
        result = repo.execute_query(query_set_name, "primary", params)
        return jsonify(result)
    except Exception:
        logger.exception("Error executing primary query: %s", query_set_name)
        return jsonify({"error": "Failed to run query"}), 500

@app.route('/api/nodes/<node_id>/neighbors', methods=['GET'])
def neighbors(node_id):
    try:
        params = dict(request.args)
        params["node_id"] = node_id
        # which query set? JS sends ?query_key=... (hidden input stores active query)
        query_key = params.get("query_key") or "default_graph"
        result = repo.execute_query(query_key, "neighbors", params)
        return jsonify(result)
    except Exception:
        logger.exception("Error fetching neighbors for node %s", node_id)
        return jsonify({"error": "Failed to fetch neighbors"}), 500

@app.route('/api/nodes/<node_id>/properties', methods=['GET'])
def node_properties(node_id):
    try:
        props = repo.get_node_properties(node_id)
        return jsonify(props or {})
    except Exception:
        logger.exception("Error fetching node properties: %s", node_id)
        return jsonify({}), 500

@app.route('/api/edges/<edge_id>/properties', methods=['GET'])
def edge_properties(edge_id):
    try:
        props = repo.get_edge_properties(edge_id)
        return jsonify(props or {})
    except Exception:
        logger.exception("Error fetching edge properties: %s", edge_id)
        return jsonify({}), 500

# Optional: hot-reload queries.yaml without restarting the webapp
@app.route('/api/reload-queries', methods=['POST'])
def reload_queries():
    try:
        repo.query_sets = load_queries_from_folder()
        return jsonify({"status": "ok"})
    except Exception:
        logger.exception("Error reloading queries.yaml")
        return jsonify({"status": "error"}), 500
