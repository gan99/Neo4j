function renderTable(rows) {
  const tbl = document.getElementById("tbl");
  tbl.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbl.innerHTML = "<tbody><tr><td>No data</td></tr></tbody>";
    return;
  }

  const cols = Object.keys(rows[0]);

  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  cols.forEach((c) => {
    const th = document.createElement("th");
    th.textContent = c;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  tbl.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    cols.forEach((c) => {
      const td = document.createElement("td");
      td.textContent = r[c];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);
}

async function loadRows() {
  const n = document.getElementById("rows").value || 100;
  const status = document.getElementById("status");
  status.textContent = "Loading...";

  // Dataiku helper builds the correct proxied URL to your backend
  const url = getWebAppBackendUrl("get-sample?n=" + encodeURIComponent(n));

  const res = await fetch(url);
  const data = await res.json();
  renderTable(data.rows);
  status.textContent = "";
}

document.getElementById("load").addEventListener("click", loadRows);
window.onload = loadRows;
