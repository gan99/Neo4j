// --- Summary Calculation ---
let summaryHTML = `<span class="summary-item"><strong>Records:</strong> ${records.length}</span>`;
const amountTotals = {};
const seenByHeader = {}; // header -> Set of element_ids already tallied

records.forEach(record => {
  keys.forEach(key => {
    const cell = record[key];
    if (!cell || !cell.properties) return;

    const props  = cell.properties;
    const type   = cell._labels?.[0] || cell._relation_type || 'Amount';
    const header = `${type} (Total)`;
    const elemId = cell.element_id || JSON.stringify(props);

    // prefer total_amount, then amount, else any '*amount*' numeric
    let val = (typeof props.total_amount === 'number') ? props.total_amount
            : (typeof props.amount === 'number')       ? props.amount
            : null;
    if (val === null) {
      for (const [k, v] of Object.entries(props)) {
        if (typeof v === 'number' && k.toLowerCase().includes('amount')) { val = v; break; }
      }
    }

    if (typeof val === 'number') {
      if (!seenByHeader[header]) seenByHeader[header] = new Set();
      if (!seenByHeader[header].has(elemId)) {
        amountTotals[header] = (amountTotals[header] || 0) + val;
        seenByHeader[header].add(elemId);
      }
    }
  });
});

for (const [k, total] of Object.entries(amountTotals)) {
  summaryHTML += `<span class="summary-item"><strong>${k}:</strong> ${total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>`;
}
summaryTotals.innerHTML = summaryHTML;
