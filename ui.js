// ── ui.js — Render functions: table, badges, modal ──

const METRIC_FIELDS = [
  { key: "ctr",                 label: "CTR",    fmt: (v) => v + "%" },
  { key: "clicks",              label: "Clicks", fmt: (v) => Number(v).toLocaleString("en-IN") },
  { key: "reach",               label: "Reach",  fmt: (v) => Number(v).toLocaleString("en-IN") },
  { key: "budget_spent",        label: "Spent",  fmt: (v) => "₹" + Number(v).toLocaleString("en-IN") },
  { key: "total_leads",         label: "Leads",  fmt: (v) => v },
  { key: "mql_leads",           label: "MQL",    fmt: (v) => v },
  { key: "mql_percent",         label: "MQL%",   fmt: (v) => v + "%" },
  { key: "click_to_lead_ratio", label: "C2L",    fmt: (v) => v },
  { key: "webinar_booked",      label: "W.Book", fmt: (v) => v },
  { key: "webinar_attended",    label: "W.Att",  fmt: (v) => v },
  { key: "converted",           label: "Conv",   fmt: (v) => v },
];

function metricCell(row, key, fmt) {
  const v = row[key];
  if (v === null || v === undefined || v === "") return `<td class="col-metric muted-cell">–</td>`;
  return `<td class="col-metric">${fmt(v)}</td>`;
}

function approvalBadge(status) {
  const map = {
    "Approved":       "badge-approved",
    "Pending":        "badge-pending",
    "Rejected":       "badge-rejected",
    "Needs Revision": "badge-revision",
  };
  return `<span class="badge ${map[status] || "badge-pending"}">${status || "–"}</span>`;
}

function scoreDotClass(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return "";
  if (n >= 7) return "high";
  if (n >= 4) return "mid";
  return "low";
}

function scoreDot(v, isAvg = false) {
  const label = v != null && v !== "" ? parseFloat(v).toFixed(1) : "–";
  return `<span class="score-dot ${isAvg ? "avg" : scoreDotClass(v)}">${label}</span>`;
}

function calcAvg(bl, pr, ta) {
  const defined = [bl, pr, ta].filter((v) => v !== null && v !== "" && v !== undefined);
  if (!defined.length) return null;
  const nums = defined.map(Number).filter((n) => !isNaN(n));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function formatDate(iso) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Render table ───────────────────────────────────────────
function renderTable(rows) {
  document.getElementById("stat-total").textContent = rows.length;
  document.getElementById("stat-approved").textContent = rows.filter((r) => r.approval === "Approved").length;
  document.getElementById("stat-pending").textContent = rows.filter((r) => r.approval === "Pending").length;

  const tbody = document.getElementById("log-body");

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="24" class="empty-cell">
      <div class="empty-state"><div class="empty-icon">◫</div><p>No entries match your filters.</p></div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r, i) => {
    const avg = calcAvg(r.bl_score, r.pr_score, r.ta_score);
    const safeRow = JSON.stringify(r).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return `
    <tr>
      <td class="col-num">${i + 1}</td>
      <td class="col-img">
        ${r.image_url
          ? `<img src="${r.image_url}" class="thumb" alt="creative"
               onclick='openModal(${JSON.stringify(r).replace(/"/g, "&quot;")})'
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
             <div class="thumb-placeholder" style="display:none">🖼</div>`
          : `<div class="thumb-placeholder">🖼</div>`}
      </td>
      <td class="col-name">${r.creative_name || "–"}</td>
      <td class="col-tag">${r.program_tag ? `<span class="tag-pill">${r.program_tag}</span>` : `<span class="muted-cell">–</span>`}</td>
      <td class="col-month muted-cell">${r.month || "–"}</td>
      <td class="col-status">${approvalBadge(r.approval)}</td>
      <td class="col-notes"><div class="notes-cell">${r.notes || "–"}</div></td>
      <td class="col-score" style="text-align:center">${scoreDot(r.bl_score)}</td>
      <td class="col-score" style="text-align:center">${scoreDot(r.pr_score)}</td>
      <td class="col-score" style="text-align:center">${scoreDot(r.ta_score)}</td>
      <td class="col-score" style="text-align:center">${scoreDot(avg != null ? avg.toFixed(1) : null, true)}</td>
      ${METRIC_FIELDS.map((f) => metricCell(r, f.key, f.fmt)).join("")}
      <td class="col-date muted-cell">${formatDate(r.created_at)}</td>
      <td class="col-actions">
        <div class="row-actions">
          <button class="act-btn edit" onclick="startEdit('${r.id}')" title="Edit">✏️</button>
          <button class="act-btn del"  onclick="deleteEntry('${r.id}')" title="Delete">🗑</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

// ── Modal ──────────────────────────────────────────────────
function openModal(row) {
  if (typeof row === "string") {
    try { row = JSON.parse(row); } catch(e) { return; }
  }
  document.getElementById("modal-img").src = row.image_url || "";
  document.getElementById("modal-title").textContent = row.creative_name || "–";
  document.getElementById("modal-status-badge").innerHTML = approvalBadge(row.approval);
  document.getElementById("modal-notes-text").textContent = row.notes || "No notes.";
  document.getElementById("modal-bl").textContent  = row.bl_score ?? "–";
  document.getElementById("modal-pr").textContent  = row.pr_score ?? "–";
  document.getElementById("modal-ta").textContent  = row.ta_score ?? "–";

  const avg = calcAvg(row.bl_score, row.pr_score, row.ta_score);
  document.getElementById("modal-avg").textContent  = avg != null ? avg.toFixed(1) : "–";
  document.getElementById("modal-date").textContent = formatDate(row.created_at);

  document.getElementById("modal-tag-pill").textContent   = row.program_tag || "";
  document.getElementById("modal-month-pill").textContent = row.month || "";

  // Metrics grid
  const grid = document.getElementById("modal-metrics-grid");
  grid.innerHTML = METRIC_FIELDS.map((f) => {
    const v = row[f.key];
    const display = (v !== null && v !== undefined && v !== "") ? f.fmt(v) : "–";
    return `<div class="mmetric"><label>${f.label}</label><strong>${display}</strong></div>`;
  }).join("");

  document.getElementById("detail-modal").classList.add("open");
}

function closeModal(e) {
  if (!e || e.target === document.getElementById("detail-modal")) {
    document.getElementById("detail-modal").classList.remove("open");
  }
}

function closeModalDirect() {
  document.getElementById("detail-modal").classList.remove("open");
}

function closeUploadModalOutside(e) {
  if (e.target === document.getElementById("upload-modal")) closeUploadModal();
}

function populateTagFilters() { /* static list in HTML */ }

// ── Toast ──────────────────────────────────────────────────
let _toastTimer;
function showToast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ""; }, 3200);
}
