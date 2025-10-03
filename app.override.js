function computeEdgeCaptions() {
  if (!window.cy) return;
  cy.edges().forEach(e => {
    let cap = e.data('Name') || e.data('name') || null;
    const props = e.data('properties') || e.data('props') || e.data('relProps') || e.data('rel_properties') || null;
    if (!cap && props && typeof props === 'object') {
      cap = props.Name || props.name || props.NAME || null;
    }
    if (!cap) cap = e.data('label') || '';
    if (e.data('edge_caption') !== cap) e.data('edge_caption', cap);
  });
}
