// ── filters.js ──

let _sortCol = "created_at";
let _sortDir = "desc";

function applyFilters() {
  const search   = document.getElementById("search-input").value.toLowerCase().trim();
  const approval = document.getElementById("approval-filter").value;
  const tag      = document.getElementById("tag-filter").value;
  const month    = document.getElementById("month-filter")?.value || "";

  let rows = [...(window._allRows || [])];

  if (search)   rows = rows.filter((r) => (r.creative_name || "").toLowerCase().includes(search) || (r.program_tag || "").toLowerCase().includes(search));
  if (approval) rows = rows.filter((r) => r.approval === approval);
  if (tag)      rows = rows.filter((r) => r.program_tag === tag);
  if (month)    rows = rows.filter((r) => r.month === month);

  rows = sortRows(rows);
  renderTable(rows);
}

// ── Populate month filter from live data ───────────────────
function populateMonthFilter(rows) {
  const sel = document.getElementById("month-filter");
  if (!sel) return;
  const current = sel.value;
  const months = [...new Set(rows.map((r) => r.month).filter(Boolean))].sort();
  sel.innerHTML = `<option value="">All Months</option>` +
    months.map((m) => `<option value="${m}" ${m === current ? "selected" : ""}>${m}</option>`).join("");
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    let av = a[_sortCol];
    let bv = b[_sortCol];
    if (_sortCol === "avg_score") {
      av = calcAvg(a.bl_score, a.pr_score, a.ta_score) ?? -Infinity;
      bv = calcAvg(b.bl_score, b.pr_score, b.ta_score) ?? -Infinity;
    } else if (["bl_score","pr_score","ta_score","ctr","clicks","reach","budget_spent","total_leads","mql_leads","mql_percent","click_to_lead_ratio","webinar_booked","webinar_attended","converted"].includes(_sortCol)) {
      av = av !== null && av !== "" ? parseFloat(av) : -Infinity;
      bv = bv !== null && bv !== "" ? parseFloat(bv) : -Infinity;
    } else if (_sortCol === "created_at") {
      av = av ? new Date(av).getTime() : 0;
      bv = bv ? new Date(bv).getTime() : 0;
    } else {
      av = (av || "").toLowerCase();
      bv = (bv || "").toLowerCase();
    }
    if (av < bv) return _sortDir === "asc" ? -1 : 1;
    if (av > bv) return _sortDir === "asc" ? 1 : -1;
    return 0;
  });
}

function toggleSort(col) {
  if (_sortCol === col) {
    _sortDir = _sortDir === "asc" ? "desc" : "asc";
  } else {
    _sortCol = col;
    _sortDir = "desc";
  }
  document.querySelectorAll("thead th .sort-arrow").forEach((el) => el.className = "sort-arrow");
  document.querySelectorAll("thead th").forEach((th) => th.classList.remove("sort-active"));
  const activeTh = document.querySelector(`thead th[data-col="${col}"]`);
  if (activeTh) {
    activeTh.classList.add("sort-active");
    const arrow = activeTh.querySelector(".sort-arrow");
    if (arrow) arrow.className = `sort-arrow ${_sortDir}`;
  }
  applyFilters();
}
