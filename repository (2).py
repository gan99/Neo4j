path = settings.queries_file_path
        if not path:
            logger.info("No queries_file_path specified; starting with empty query sets")
            return {}
        try:
            p = Path(path)
            logger.info(f"Loading queries from {p.resolve()}")
            with p.open("r") as f:
                return yaml.safe_load(f) or {}
        except FileNotFoundError:
            logger.warning(f"queries.yaml not found at {path}; will expect injection from DSS backend")
            return {}
        except Exception:
            logger.exception("Failed to load queries.yaml; falling back to empty")
            return {}
