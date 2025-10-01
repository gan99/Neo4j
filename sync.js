cy.nodes().forEach(other => {
  if (other.id() !== nodeId && other.scratch('_expanded')) {
    const ownerId = other.id();
    const col = other.scratch('_expansionCol');
    if (col && col.length) {
      col.forEach(ele => {
        const owners = Array.isArray(ele.data('_owners')) ? ele.data('_owners') : [];
        const nextOwners = owners.filter(o => o !== ownerId);
        if (nextOwners.length === 0) {
          if (ele.id() !== nodeId) ele.remove();               // remove others
          else ele.data('_owners', nextOwners);                // keep the clicked node
        } else {
          ele.data('_owners', nextOwners);
        }
      });
    } else {
      const ids = other.scratch('_expansionIds') || [];
      ids.forEach(id => {
        const ele = cy.getElementById(id);
        if (ele && ele.length) {
          const owners = Array.isArray(ele.data('_owners')) ? ele.data('_owners') : [];
          const nextOwners = owners.filter(o => o !== ownerId);
          if (nextOwners.length === 0) {
            if (id !== nodeId) ele.remove();
            else ele.data('_owners', nextOwners);
          } else {
            ele.data('_owners', nextOwners);
          }
        }
      });
    }
    other.scratch('_expanded', false);
    other.scratch('_expansionIds', []);
    other.scratch('_expansionCol', null);
    other.removeClass('expanded');
  }
});
