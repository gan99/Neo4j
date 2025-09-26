caption_val = None
        try:
            # 1) try the configured caption property (default "name")
            if edge_caption_prop and value.get(edge_caption_prop) is not None:
                caption_val = value.get(edge_caption_prop)
        except Exception:
            caption_val = None

        # 2) fallback: a literal "name" property if present
        if caption_val is None and value.get("name") is not None:
            caption_val = value.get("name")

        # 3) fallback: relationship type (e.g., INTERACTS)
        if caption_val is None:
            caption_val = type(value).__name__

        edge_data["caption"] = str(caption_val)
        # --- end NEW ---

        edges[edge_id] = {"data": edge_data}
