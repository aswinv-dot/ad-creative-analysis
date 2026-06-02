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

const BL_METRICS = [
  { id: "bl1", label: "Image–Product Fit",         weight: "High" },
  { id: "bl2", label: "Key Message Alignment",     weight: "High" },
  { id: "bl3", label: "Product Feature Highlight", weight: "High" },
  { id: "bl4", label: "Offer / Promotion Clarity", weight: "High" },
  { id: "bl5", label: "Platform & Placement Fit",  weight: "Med"  },
  { id: "bl6", label: "Cultural Sensitivity",      weight: "High" },
  { id: "bl7", label: "On-Brief Score",            weight: "High" },
];

const PR_METRICS = [
  { id: "pr1",  label: "Visual Hierarchy",            weight: "High" },
  { id: "pr2",  label: "Image Resolution & Quality",  weight: "High" },
  { id: "pr3",  label: "Layout & Composition",        weight: "High" },
  { id: "pr4",  label: "Colour Contrast & Legibility",weight: "High" },
  { id: "pr5",  label: "Ad Size & Dimensions",        weight: "High" },
  { id: "pr6",  label: "Safe Zone Compliance",        weight: "High" },
  { id: "pr7",  label: "File Format & Size",          weight: "High" },
  { id: "pr8",  label: "Mobile Rendering",            weight: "High" },
  { id: "pr9",  label: "Animation / Video Pacing",    weight: "Med"  },
  { id: "pr10", label: "Text-to-Image Ratio",         weight: "Med"  },
  { id: "pr11", label: "Consistency Across Variants", weight: "Med"  },
  { id: "pr12", label: "Overall Aesthetic Appeal",    weight: "Med"  },
];

const TA_METRICS = [
  { id: "ta1", label: "Audience Relevance",        weight: "High" },
  { id: "ta2", label: "Tone & Language Fit",       weight: "High" },
  { id: "ta3", label: "Demographic Alignment",     weight: "High" },
  { id: "ta4", label: "Pain Point Addressed",      weight: "High" },
  { id: "ta5", label: "CTA Relevance to Audience", weight: "Med"  },
];

// star ratings state
let _starRatings = {};

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

    // Only analyst sees metric columns
    const metricCells = role === "analyst" ? METRIC_FIELDS.map((f) => {
      const v = r[f.key];
      return `<td class="col-metric ${v == null || v === "" ? "muted-cell" : ""}">${v != null && v !== "" ? f.fmt(v) : "–"}</td>`;
    }).join("") : "";

    let actions = "";
    if (role === "uploader") {
      actions = `
        <button class="act-btn edit" onclick="startEdit('${r.id}')" title="Edit">✏️</button>
        <button class="act-btn del"  onclick="deleteEntry('${r.id}')" title="Delete">🗑</button>`;
    } else if (role === "reviewer") {
      actions = `<button class="act-btn review" onclick="openReviewModal('${r.id}')" title="Review">⭐</button>`;
    } else if (role === "analyst") {
      actions = `<button class="act-btn metrics" onclick="openMetricsModal('${r.id}')" title="View Metrics">📊</button>`;
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

  // Metric columns visible for analyst only
  document.querySelectorAll(".metric-th").forEach((th) => {
    th.style.display = role === "analyst" ? "" : "none";
  });
}

// ── Star rating helpers ────────────────────────────────────
function initStars() {
  _starRatings = {};
  [...BL_METRICS, ...PR_METRICS, ...TA_METRICS].forEach((m) => { _starRatings[m.id] = 0; });
}

function buildStarRows(metrics, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = metrics.map((m) => `
    <div class="rubric-row" id="srow-${m.id}">
      <span class="rnum">${m.id.replace(/[a-z]+/,"")}</span>
      <div class="rdetail"><div class="rmetric">${m.label}</div></div>
      <span class="rweight ${m.weight === 'High' ? 'high' : 'med'}">${m.weight}</span>
      <div class="star-group" data-metric="${m.id}">
        ${[1,2,3,4,5].map((n) => `
          <button class="star-btn" data-id="${m.id}" data-val="${n}" onclick="rateStar('${m.id}',${n})" title="${n}">
            <svg viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
          </button>`).join("")}
      </div>
      <span class="star-val" id="sv-${m.id}">–</span>
    </div>`).join("");
}

function rateStar(id, val) {
  // Click same star again = clear
  _starRatings[id] = _starRatings[id] === val ? 0 : val;
  refreshStars(id);
  recomputeScores();
}

function refreshStars(id) {
  const val = _starRatings[id];
  document.querySelectorAll(`.star-btn[data-id="${id}"]`).forEach((btn) => {
    btn.classList.toggle("filled", parseInt(btn.dataset.val) <= val);
  });
  document.getElementById("sv-" + id).textContent = val > 0 ? val : "–";
}

function recomputeScores() {
  const avg = (metrics) => {
    const rated = metrics.map((m) => _starRatings[m.id]).filter((v) => v > 0);
    if (!rated.length) return null;
    return (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(2);
  };
  const bl = avg(BL_METRICS);
  const pr = avg(PR_METRICS);
  const ta = avg(TA_METRICS);

  document.getElementById("review-bl-display").textContent = bl ?? "–";
  document.getElementById("review-pr-display").textContent = pr ?? "–";
  document.getElementById("review-ta-display").textContent = ta ?? "–";

  const allAvg = calcAvg(bl, pr, ta);
  document.getElementById("review-avg-display").textContent = allAvg != null ? parseFloat(allAvg).toFixed(2) : "–";

  // Store computed values for submission
  window._computedBL = bl;
  window._computedPR = pr;
  window._computedTA = ta;
}

// ── Review Modal ───────────────────────────────────────────
let _reviewApproval = null;

function openReviewModal(id) {
  const row = window._allRows.find((r) => r.id === id);
  if (!row) return;
  window._reviewingId = id;
  _reviewApproval = null;
  window._computedBL = null;
  window._computedPR = null;
  window._computedTA = null;

  document.getElementById("review-img").src = row.image_url || "";
  document.getElementById("review-name").textContent = row.creative_name || "–";
  document.getElementById("review-tag-pill").textContent   = row.program_tag || "";
  document.getElementById("review-month-pill").textContent = row.month || "";

  // Reset score displays
  document.getElementById("review-bl-display").textContent = "–";
  document.getElementById("review-pr-display").textContent = "–";
  document.getElementById("review-ta-display").textContent = "–";
  document.getElementById("review-avg-display").textContent = "–";

  // Reset approval buttons
  document.querySelectorAll(".approval-action-btn").forEach((b) => b.classList.remove("active-selection"));
  document.getElementById("review-approval-display").textContent = "No decision yet";

  // Clear feedback
  document.getElementById("review-feedback").value    = "";
  document.getElementById("review-suggestions").value = "";

  // Build star rows
  initStars();
  buildStarRows(BL_METRICS, "bl-star-rows");
  buildStarRows(PR_METRICS, "pr-star-rows");
  buildStarRows(TA_METRICS, "ta-star-rows");

  switchReviewTab("rubric-bl", document.querySelector(".rtab"));
  document.getElementById("review-modal").classList.add("open");
}

function setReviewApproval(status) {
  _reviewApproval = status;
  document.querySelectorAll(".approval-action-btn").forEach((b) => b.classList.remove("active-selection"));
  const map = { "Approved": "approve", "Needs Revision": "revise", "Rejected": "reject" };
  document.querySelector(`.approval-action-btn.${map[status]}`)?.classList.add("active-selection");
  document.getElementById("review-approval-display").textContent = "Selected: " + status;

  // Auto-switch to feedback tab if revise/reject
  if (status === "Needs Revision" || status === "Rejected") {
    switchReviewTab("feedback", document.querySelectorAll(".rtab")[3]);
    showToast("Please add feedback or suggestions", "info");
  }
}

function switchReviewTab(tab, btn) {
  ["rubric-bl", "rubric-pr", "rubric-ta", "feedback"].forEach((t) => {
    const el = document.getElementById("rtab-" + t);
    if (el) el.style.display = t === tab ? "block" : "none";
  });
  document.querySelectorAll(".rtab").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
}

async function submitReview() {
  const id = window._reviewingId;
  if (!id) return;
  if (!_reviewApproval) { showToast("Please set an approval decision", "error"); return; }

  const needsFeedback = _reviewApproval === "Needs Revision" || _reviewApproval === "Rejected";
  const feedback    = document.getElementById("review-feedback").value.trim();
  const suggestions = document.getElementById("review-suggestions").value.trim();
  if (needsFeedback && !feedback && !suggestions) {
    switchReviewTab("feedback", document.querySelectorAll(".rtab")[3]);
    showToast("Please add feedback or suggestions before saving", "error");
    return;
  }

  const btn = document.querySelector(".submit-review-btn");
  btn.disabled = true; btn.textContent = "Saving…";

  try {
    await dbUpdateEntry(id, {
      bl_score:    window._computedBL !== null ? window._computedBL : null,
      pr_score:    window._computedPR !== null ? window._computedPR : null,
      ta_score:    window._computedTA !== null ? window._computedTA : null,
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

  document.getElementById("metrics-modal-img").src = row.image_url || "";
  document.getElementById("metrics-modal-img").style.display = row.image_url ? "block" : "none";
  document.getElementById("metrics-modal-name").textContent = row.creative_name || "–";
  document.getElementById("metrics-tag-pill").textContent   = row.program_tag || "";
  document.getElementById("metrics-month-pill").textContent = row.month || "";
  document.getElementById("metrics-status-badge").innerHTML = approvalBadge(row.approval);
  document.getElementById("mm-bl").textContent  = row.bl_score ?? "–";
  document.getElementById("mm-pr").textContent  = row.pr_score ?? "–";
  document.getElementById("mm-ta").textContent  = row.ta_score ?? "–";
  const avg = calcAvg(row.bl_score, row.pr_score, row.ta_score);
  document.getElementById("mm-avg").textContent = avg != null ? avg.toFixed(2) : "–";

  document.getElementById("metrics-grid").innerHTML = METRIC_FIELDS.map((f) => {
    const v = row[f.key];
    const isEmpty = v == null || v === "";
    return `<div class="mmetric"><label>${f.label}</label><strong class="${isEmpty ? "empty" : ""}">${isEmpty ? "–" : f.fmt(v)}</strong></div>`;
  }).join("");

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

function populateTagFilters() {}

// ── Toast ──────────────────────────────────────────────────
let _toastTimer;
function showToast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg; el.className = `show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ""; }, 3200);
}
