def get_driver() -> Driver:
    """Returns the singleton Neo4j driver instance, creating it if necessary."""
    global _driver
    if _driver is None:
        # (optional) friendly guard if secrets not applied yet
        if not settings.neo4j_uri or not settings.neo4j_user or not settings.neo4j_password:
            raise RuntimeError(
                "Neo4j credentials are not set. In DSS, define secrets "
                "'neo4j_uri', 'neo4j_user', 'neo4j_password', 'neo4j_database'."
            )
        logger.info(f"Initializing Neo4j driver for database '{settings.neo4j_database}'...")
        _driver = GraphDatabase.driver(settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password))
        _driver.verify_connectivity()
        logger.info("Neo4j driver initialized successfully.")
    return _driver

def close_driver():
    global _driver
    if _driver:
        logger.info("Closing Neo4j driver.")
        _driver.close()
        _driver = None
