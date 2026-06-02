// ── ui.js — Render functions: table, badges, modal ──

// ── Badge helpers ──────────────────────────────────────────
function approvalBadge(status) {
  const map = {
    "Approved":       "badge-approved",
    "Pending":        "badge-pending",
    "Rejected":       "badge-rejected",
    "Needs Revision": "badge-revision",
  };
  return `<span class="badge ${map[status] || "badge-pending"}">${status || "–"}</span>`;
}

function scoreDotClass(v, isAvg = false) {
  if (isAvg) return "avg";
  const n = parseFloat(v);
  if (isNaN(n)) return "";
  if (n >= 7) return "high";
  if (n >= 4) return "mid";
  return "low";
}

function scoreDot(v, isAvg = false) {
  const label = v != null && v !== "" ? parseFloat(v).toFixed(1) : "–";
  return `<span class="score-dot ${scoreDotClass(v, isAvg)}">${label}</span>`;
}

function calcAvg(bl, pr, ta) {
  const vals = [bl, pr, ta].map(Number).filter((n) => !isNaN(n) && n !== 0 || n === 0);
  const defined = [bl, pr, ta].filter((v) => v !== null && v !== "" && v !== undefined);
  if (!defined.length) return null;
  const nums = defined.map(Number).filter((n) => !isNaN(n));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function formatDate(iso) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Render full table ──────────────────────────────────────
function renderTable(rows) {
  // Stats
  document.getElementById("stat-total").textContent = rows.length;
  document.getElementById("stat-approved").textContent = rows.filter((r) => r.approval === "Approved").length;
  document.getElementById("stat-pending").textContent = rows.filter((r) => r.approval === "Pending").length;

  const tbody = document.getElementById("log-body");

  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="12" class="empty-cell">
        <div class="empty-state">
          <div class="empty-icon">◫</div>
          <p>No entries match your filters.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r, i) => {
    const avg = calcAvg(r.bl_score, r.pr_score, r.ta_score);
    const rowData = encodeURIComponent(JSON.stringify(r));
    return `
    <tr>
      <td class="col-num">${i + 1}</td>
      <td class="col-img">
        ${r.image_url
          ? `<img src="${r.image_url}" class="thumb" alt="creative"
               onclick='openModal(${JSON.stringify(r).replace(/'/g, "&#39;")})' 
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
             /><div class="thumb-placeholder" style="display:none">🖼</div>`
          : `<div class="thumb-placeholder">🖼</div>`
        }
      </td>
      <td class="col-name">${r.creative_name || "–"}</td>
      <td class="col-tag">${r.program_tag ? `<span class="tag-pill">${r.program_tag}</span>` : "<span style='color:var(--muted)'>–</span>"}</td>
      <td class="col-status">${approvalBadge(r.approval)}</td>
      <td class="col-notes"><div class="notes-cell">${r.notes || "–"}</div></td>
      <td class="col-score" style="text-align:center">${scoreDot(r.bl_score)}</td>
      <td class="col-score" style="text-align:center">${scoreDot(r.pr_score)}</td>
      <td class="col-score" style="text-align:center">${scoreDot(r.ta_score)}</td>
      <td class="col-score" style="text-align:center">${scoreDot(avg != null ? avg.toFixed(1) : null, true)}</td>
      <td class="col-date" style="color:var(--muted);font-size:0.78rem">${formatDate(r.created_at)}</td>
      <td class="col-actions">
        <div class="row-actions">
          <button class="act-btn edit" onclick="startEdit('${r.id}')" title="Edit">✏️</button>
          <button class="act-btn del" onclick="deleteEntry('${r.id}')" title="Delete">🗑</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

// ── Modal ──────────────────────────────────────────────────
function openModal(row) {
  document.getElementById("modal-img").src = row.image_url || "";
  document.getElementById("modal-title").textContent = row.creative_name || "–";
  document.getElementById("modal-status-badge").innerHTML = approvalBadge(row.approval);
  document.getElementById("modal-notes-text").textContent = row.notes || "No notes.";
  document.getElementById("modal-bl").textContent = row.bl_score ?? "–";
  document.getElementById("modal-pr").textContent = row.pr_score ?? "–";
  document.getElementById("modal-ta").textContent = row.ta_score ?? "–";

  const avg = calcAvg(row.bl_score, row.pr_score, row.ta_score);
  document.getElementById("modal-avg").textContent = avg != null ? avg.toFixed(1) : "–";
  document.getElementById("modal-date").textContent = formatDate(row.created_at);

  const tagPill = document.getElementById("modal-tag-pill");
  tagPill.textContent = row.program_tag || "";

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

// ── Tag datalist + filter dropdown ────────────────────────
function populateTagFilters(rows) {
  const tags = [...new Set(rows.map((r) => r.program_tag).filter(Boolean))].sort();

  // Datalist for form autocomplete
  const dl = document.getElementById("tag-suggestions");
  dl.innerHTML = tags.map((t) => `<option value="${t}">`).join("");

  // Dropdown filter
  const sel = document.getElementById("tag-filter");
  const current = sel.value;
  sel.innerHTML = `<option value="">All Tags</option>` +
    tags.map((t) => `<option value="${t}" ${t === current ? "selected" : ""}>${t}</option>`).join("");
}

// ── Toast ──────────────────────────────────────────────────
let _toastTimer;
function showToast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ""; }, 3200);
}
