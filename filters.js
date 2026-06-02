// ── filters.js — Search, filter, sort logic ──

let _sortCol = "created_at";
let _sortDir = "desc"; // "asc" | "desc"

// ── Apply all active filters + sort, then render ──────────
function applyFilters() {
  const search = document.getElementById("search-input").value.toLowerCase().trim();
  const approvalFilter = document.getElementById("approval-filter").value;
  const tagFilter = document.getElementById("tag-filter").value;

  let rows = [...window._allRows];

  if (search) {
    rows = rows.filter((r) =>
      (r.creative_name || "").toLowerCase().includes(search) ||
      (r.program_tag || "").toLowerCase().includes(search) ||
      (r.notes || "").toLowerCase().includes(search)
    );
  }

  if (approvalFilter) {
    rows = rows.filter((r) => r.approval === approvalFilter);
  }

  if (tagFilter) {
    rows = rows.filter((r) => r.program_tag === tagFilter);
  }

  rows = sortRows(rows);
  renderTable(rows);
}

// ── Sort ───────────────────────────────────────────────────
function sortRows(rows) {
  return [...rows].sort((a, b) => {
    let av = a[_sortCol];
    let bv = b[_sortCol];

    // avg_score is computed, not a DB column
    if (_sortCol === "avg_score") {
      av = calcAvg(a.bl_score, a.pr_score, a.ta_score);
      bv = calcAvg(b.bl_score, b.pr_score, b.ta_score);
      av = av ?? -Infinity;
      bv = bv ?? -Infinity;
    } else if (["bl_score", "pr_score", "ta_score"].includes(_sortCol)) {
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

// ── Toggle sort column ─────────────────────────────────────
function toggleSort(col) {
  if (_sortCol === col) {
    _sortDir = _sortDir === "asc" ? "desc" : "asc";
  } else {
    _sortCol = col;
    _sortDir = col === "created_at" ? "desc" : "desc";
  }

  // Update header arrow UI
  document.querySelectorAll("thead th .sort-arrow").forEach((el) => {
    el.className = "sort-arrow";
  });
  document.querySelectorAll("thead th").forEach((th) => {
    th.classList.remove("sort-active");
  });

  const activeTh = document.querySelector(`thead th[data-col="${col}"]`);
  if (activeTh) {
    activeTh.classList.add("sort-active");
    const arrow = activeTh.querySelector(".sort-arrow");
    if (arrow) arrow.className = `sort-arrow ${_sortDir}`;
  }

  applyFilters();
}
