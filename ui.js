// ── ui.js ──

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

function approvalBadge(status) {
  const map = { "Approved": "badge-approved", "Pending": "badge-pending", "Rejected": "badge-rejected", "Needs Revision": "badge-revision" };
  return `<span class="badge ${map[status] || "badge-pending"}">${status || "–"}</span>`;
}

function scoreDot(v, isAvg = false) {
  const label = v != null && v !== "" ? parseFloat(v).toFixed(1) : "–";
  const n = parseFloat(v);
  let cls = "";
  if (isAvg) cls = "avg";
  else if (!isNaN(n)) cls = n >= 4 ? "high" : n >= 2.5 ? "mid" : "low";
  return `<span class="score-dot ${cls}">${label}</span>`;
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
  const role  = window._currentRole || "uploader";

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="23" class="empty-cell"><div class="empty-state"><div class="empty-icon">◫</div><p>No entries yet.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r, i) => {
    const avg = calcAvg(r.bl_score, r.pr_score, r.ta_score);

    const metricCells = METRIC_FIELDS.map((f) => {
      const v = r[f.key];
      return `<td class="col-metric ${v == null || v === "" ? "muted-cell" : ""}">${v != null && v !== "" ? f.fmt(v) : "–"}</td>`;
    }).join("");

    // Role-specific action buttons
    let actions = "";
    if (role === "uploader") {
      actions = `
        <button class="act-btn edit" onclick="startEdit('${r.id}')" title="Edit">✏️</button>
        <button class="act-btn del"  onclick="deleteEntry('${r.id}')" title="Delete">🗑</button>`;
    } else if (role === "reviewer") {
      actions = `
        <button class="act-btn review" onclick="openReviewModal('${r.id}')" title="Review">⭐</button>`;
    } else if (role === "analyst") {
      actions = `
        <button class="act-btn metrics" onclick="openMetricsModal('${r.id}')" title="View Metrics">📊</button>`;
    }

    return `
    <tr>
      <td class="col-num">${i + 1}</td>
      <td class="col-img">
        ${r.image_url
          ? `<img src="${r.image_url}" class="thumb" alt="creative"
               onclick='openMetricsModal("${r.id}")'
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
             <div class="thumb-placeholder" style="display:none">🖼</div>`
          : `<div class="thumb-placeholder">🖼</div>`}
      </td>
      <td class="col-name">${r.creative_name || "–"}</td>
      <td class="col-tag">${r.program_tag ? `<span class="tag-pill">${r.program_tag}</span>` : `<span class="muted-cell">–</span>`}</td>
      <td class="col-month muted-cell">${r.month || "–"}</td>
      <td class="col-status">${approvalBadge(r.approval)}</td>
      <td class="col-score" style="text-align:center">${scoreDot(r.bl_score)}</td>
      <td class="col-score" style="text-align:center">${scoreDot(r.pr_score)}</td>
      <td class="col-score" style="text-align:center">${scoreDot(r.ta_score)}</td>
      <td class="col-score" style="text-align:center">${scoreDot(avg != null ? avg.toFixed(1) : null, true)}</td>
      ${metricCells}
      <td class="col-date muted-cell">${formatDate(r.created_at)}</td>
      <td class="col-actions"><div class="row-actions">${actions}</div></td>
    </tr>`;
  }).join("");
}

// ── Review Modal ───────────────────────────────────────────
let _reviewApproval = null;

function openReviewModal(id) {
  const row = window._allRows.find((r) => r.id === id);
  if (!row) return;

  window._reviewingId = id;
  _reviewApproval = row.approval || null;

  document.getElementById("review-img").src     = row.image_url || "";
  document.getElementById("review-name").textContent = row.creative_name || "–";
  document.getElementById("review-tag-pill").textContent   = row.program_tag || "";
  document.getElementById("review-month-pill").textContent = row.month || "";
  document.getElementById("review-bl").value = row.bl_score ?? "";
  document.getElementById("review-pr").value = row.pr_score ?? "";
  document.getElementById("review-ta").value = row.ta_score ?? "";
  document.getElementById("review-feedback").value    = row.feedback || "";
  document.getElementById("review-suggestions").value = row.suggestions || "";

  // Restore approval button highlight
  document.querySelectorAll(".approval-action-btn").forEach((b) => b.classList.remove("active-selection"));
  if (_reviewApproval) {
    const map = { "Approved": "approve", "Needs Revision": "revise", "Rejected": "reject" };
    const cls = map[_reviewApproval];
    if (cls) document.querySelector(`.approval-action-btn.${cls}`)?.classList.add("active-selection");
  }
  document.getElementById("review-approval-display").textContent = _reviewApproval ? "Selected: " + _reviewApproval : "No decision yet";

  // Default to rubric tab
  switchReviewTab("rubric", document.querySelector(".rtab"));
  document.getElementById("review-modal").classList.add("open");
}

function setReviewApproval(status) {
  _reviewApproval = status;
  document.querySelectorAll(".approval-action-btn").forEach((b) => b.classList.remove("active-selection"));
  const map = { "Approved": "approve", "Needs Revision": "revise", "Rejected": "reject" };
  const cls = map[status];
  if (cls) document.querySelector(`.approval-action-btn.${cls}`)?.classList.add("active-selection");
  document.getElementById("review-approval-display").textContent = "Selected: " + status;
}

function switchReviewTab(tab, btn) {
  document.getElementById("rtab-rubric").style.display   = tab === "rubric"   ? "block" : "none";
  document.getElementById("rtab-feedback").style.display = tab === "feedback" ? "block" : "none";
  document.querySelectorAll(".rtab").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  else {
    const tabs = document.querySelectorAll(".rtab");
    tabs[tab === "rubric" ? 0 : 1]?.classList.add("active");
  }
}

async function submitReview() {
  const id = window._reviewingId;
  if (!id) return;

  const bl = document.getElementById("review-bl").value.trim();
  const pr = document.getElementById("review-pr").value.trim();
  const ta = document.getElementById("review-ta").value.trim();
  const feedback    = document.getElementById("review-feedback").value.trim();
  const suggestions = document.getElementById("review-suggestions").value.trim();

  if (!_reviewApproval) { showToast("Please set an approval decision", "error"); return; }

  const btn = document.querySelector(".submit-review-btn");
  btn.disabled = true; btn.textContent = "Saving…";

  try {
    await dbUpdateEntry(id, {
      bl_score:    bl !== "" ? bl : null,
      pr_score:    pr !== "" ? pr : null,
      ta_score:    ta !== "" ? ta : null,
      approval:    _reviewApproval,
      feedback:    feedback || null,
      suggestions: suggestions || null,
    });
    showToast("Review saved", "success");
    closeReviewModal();
    loadEntries();
  } catch (err) {
    showToast("Error: " + err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "Save Review";
  }
}

function closeReviewModal() { document.getElementById("review-modal").classList.remove("open"); }
function closeReviewModalOutside(e) { if (e.target === document.getElementById("review-modal")) closeReviewModal(); }

// ── Metrics Modal ──────────────────────────────────────────
function openMetricsModal(id) {
  const row = window._allRows.find((r) => r.id === id);
  if (!row) return;

  document.getElementById("metrics-modal-name").textContent = row.creative_name || "–";
  document.getElementById("metrics-tag-pill").textContent   = row.program_tag || "";
  document.getElementById("metrics-month-pill").textContent = row.month || "";
  document.getElementById("metrics-status-badge").innerHTML = approvalBadge(row.approval);

  // Scores
  document.getElementById("mm-bl").textContent  = row.bl_score ?? "–";
  document.getElementById("mm-pr").textContent  = row.pr_score ?? "–";
  document.getElementById("mm-ta").textContent  = row.ta_score ?? "–";
  const avg = calcAvg(row.bl_score, row.pr_score, row.ta_score);
  document.getElementById("mm-avg").textContent = avg != null ? avg.toFixed(1) : "–";

  // Metrics grid
  document.getElementById("metrics-grid").innerHTML = METRIC_FIELDS.map((f) => {
    const v = row[f.key];
    const display = (v != null && v !== "") ? f.fmt(v) : "–";
    const isEmpty = v == null || v === "";
    return `<div class="mmetric"><label>${f.label}</label><strong class="${isEmpty ? "empty" : ""}">${display}</strong></div>`;
  }).join("");

  // Feedback / suggestions
  const hasFb = row.feedback || row.suggestions;
  const fbRow = document.getElementById("metrics-feedback-row");
  fbRow.style.display = hasFb ? "grid" : "none";
  if (hasFb) {
    document.getElementById("mm-feedback").textContent    = row.feedback    || "–";
    document.getElementById("mm-suggestions").textContent = row.suggestions || "–";
  }

  document.getElementById("metrics-modal").classList.add("open");
}

function closeMetricsModal() { document.getElementById("metrics-modal").classList.remove("open"); }
function closeMetricsModalOutside(e) { if (e.target === document.getElementById("metrics-modal")) closeMetricsModal(); }

// ── Tag filters ────────────────────────────────────────────
function populateTagFilters() {}

// ── Toast ──────────────────────────────────────────────────
let _toastTimer;
function showToast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg; el.className = `show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ""; }, 3200);
}
