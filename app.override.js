 (ele) => {            // <-- starts at line ~279
      const prop = currentQuery && currentQuery.edge_caption_property;
      const getText = (val) => { /* normalizes string/number/boolean/array/object */ };
      const v1 = prop ? ele.data(prop) : undefined;
      const v2 = getText(v1);
      if (v2) return v2;
      const v3 = getText(ele.data('label'));
      if (v3) return v3;
      const v4 = getText(ele.data('name'));
      if (v4) return v4;
      return '';
    }        
