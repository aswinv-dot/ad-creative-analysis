// ── upload.js — JSON upload, match, preview, confirm ──

const METRIC_FIELDS = [
  { key: "ctr",                  label: "CTR (%)" },
  { key: "clicks",               label: "Clicks" },
  { key: "reach",                label: "Reach" },
  { key: "budget_spent",         label: "Budget Spent" },
  { key: "total_leads",          label: "Total Leads" },
  { key: "mql_leads",            label: "MQL Leads" },
  { key: "mql_percent",          label: "MQL %" },
  { key: "click_to_lead_ratio",  label: "Click-to-Lead Ratio" },
  { key: "webinar_booked",       label: "Webinar Booked" },
  { key: "webinar_attended",     label: "Webinar Attended" },
  { key: "converted",            label: "Converted" },
];

let _uploadRows = []; // parsed + classified rows

// ── Open modal ─────────────────────────────────────────────
function openUploadModal() {
  document.getElementById("upload-modal").classList.add("open");
  resetUploadModal();
}

function closeUploadModal() {
  document.getElementById("upload-modal").classList.remove("open");
  resetUploadModal();
}

function resetUploadModal() {
  _uploadRows = [];
  document.getElementById("json-file-input").value = "";
  document.getElementById("upload-drop-zone").classList.remove("has-file");
  document.getElementById("upload-file-name").textContent = "";
  document.getElementById("upload-preview-section").style.display = "none";
  document.getElementById("upload-confirm-btn").style.display = "none";
  document.getElementById("upload-drop-zone").style.display = "flex";
  document.getElementById("upload-summary").innerHTML = "";
  document.getElementById("upload-preview-body").innerHTML = "";
}

// ── File input / drop ──────────────────────────────────────
function setupUploadDropZone() {
  const zone  = document.getElementById("upload-drop-zone");
  const input = document.getElementById("json-file-input");

  input.addEventListener("change", (e) => {
    if (e.target.files[0]) handleJsonFile(e.target.files[0]);
  });

  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("over");
    const file = e.dataTransfer.files[0];
    if (file) handleJsonFile(file);
  });
}

// ── Parse file ─────────────────────────────────────────────
function handleJsonFile(file) {
  if (!file.name.endsWith(".json")) {
    showToast("Please upload a .json file", "error");
    return;
  }
  document.getElementById("upload-file-name").textContent = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      classifyAndPreview(arr);
    } catch (err) {
      showToast("Invalid JSON: " + err.message, "error");
    }
  };
  reader.readAsText(file);
}

// ── Classify rows: matched / unmatched / overwrite ─────────
function classifyAndPreview(jsonRows) {
  const existingNames = new Map();
  (window._allRows || []).forEach((r) => {
    existingNames.set((r.creative_name || "").trim().toLowerCase(), r);
  });

  _uploadRows = jsonRows.map((row) => {
    const name = (row.creative_name || row["Creative Name"] || row["name"] || "").trim();
    const key  = name.toLowerCase();
    const existing = existingNames.get(key);

    let status = "unmatched";
    let willOverwrite = false;

    if (existing) {
      // Check if any metric field already has data
      const hasExistingMetrics = METRIC_FIELDS.some(
        (f) => existing[f.key] !== null && existing[f.key] !== undefined && existing[f.key] !== ""
      );
      status = hasExistingMetrics ? "overwrite" : "matched";
      willOverwrite = hasExistingMetrics;
    }

    return { ...row, _name: name, _status: status, _existing: existing || null, _include: status !== "unmatched", _allowOverwrite: false };
  });

  renderUploadPreview();
}

// ── Render preview table ───────────────────────────────────
function renderUploadPreview() {
  const matched   = _uploadRows.filter((r) => r._status === "matched").length;
  const unmatched = _uploadRows.filter((r) => r._status === "unmatched").length;
  const overwrite = _uploadRows.filter((r) => r._status === "overwrite").length;

  // Summary pills
  document.getElementById("upload-summary").innerHTML = `
    <span class="upill match">${matched} Matched</span>
    <span class="upill unmatched">${unmatched} Unmatched</span>
    <span class="upill overwrite">${overwrite} Will Overwrite</span>
    ${overwrite > 0 ? `<label class="allow-all-label"><input type="checkbox" id="allow-all-overwrites" onchange="toggleAllOverwrites(this.checked)" /> Allow all overwrites</label>` : ""}
  `;

  // Table rows
  const tbody = document.getElementById("upload-preview-body");
  tbody.innerHTML = _uploadRows.map((row, i) => {
    const pillMap = {
      matched:   `<span class="upill match">Match</span>`,
      unmatched: `<span class="upill unmatched">No Match</span>`,
      overwrite: `<span class="upill overwrite">Overwrite</span>`,
    };

    const metricsHtml = METRIC_FIELDS.map((f) => {
      const val = row[f.key] ?? row[f.label] ?? "–";
      return `<td class="upc-metric">${val !== undefined && val !== null && val !== "" ? val : "–"}</td>`;
    }).join("");

    const overwriteCheck = row._status === "overwrite"
      ? `<input type="checkbox" class="ow-check" data-idx="${i}" onchange="toggleRowOverwrite(${i}, this.checked)" ${row._allowOverwrite ? "checked" : ""} />`
      : "";

    const rowClass = row._status === "unmatched" ? "upr-unmatched" : row._status === "overwrite" ? "upr-overwrite" : "";

    return `
      <tr class="${rowClass}">
        <td>${pillMap[row._status]}</td>
        <td class="upc-name">${row._name || "–"}</td>
        ${metricsHtml}
        <td>${overwriteCheck}</td>
      </tr>`;
  }).join("");

  document.getElementById("upload-preview-section").style.display = "block";
  document.getElementById("upload-confirm-btn").style.display = "inline-flex";
}

// ── Overwrite toggles ──────────────────────────────────────
function toggleRowOverwrite(idx, checked) {
  _uploadRows[idx]._allowOverwrite = checked;
}

function toggleAllOverwrites(checked) {
  _uploadRows.forEach((r, i) => {
    if (r._status === "overwrite") {
      r._allowOverwrite = checked;
      const cb = document.querySelector(`.ow-check[data-idx="${i}"]`);
      if (cb) cb.checked = checked;
    }
  });
}

// ── Confirm & write to DB ──────────────────────────────────
async function confirmUpload() {
  const toWrite = _uploadRows.filter((r) => {
    if (r._status === "unmatched") return false;
    if (r._status === "overwrite" && !r._allowOverwrite) return false;
    return true;
  });

  if (!toWrite.length) {
    showToast("Nothing to import. Check matches or enable overwrites.", "error");
    return;
  }

  const btn = document.getElementById("upload-confirm-btn");
  btn.disabled = true;
  btn.textContent = "Importing…";

  let success = 0;
  let failed  = 0;

  for (const row of toWrite) {
    const fields = {};
    METRIC_FIELDS.forEach((f) => {
      const val = row[f.key] ?? row[f.label];
      if (val !== undefined && val !== null && val !== "") {
        fields[f.key] = val;
      }
    });

    try {
      await dbUpdateEntry(row._existing.id, fields);
      success++;
    } catch (err) {
      console.error("Failed to update", row._name, err);
      failed++;
    }
  }

  btn.disabled = false;
  btn.textContent = "Confirm Import";

  if (failed) {
    showToast(`Done: ${success} updated, ${failed} failed`, "error");
  } else {
    showToast(`${success} creatives updated`, "success");
  }

  closeUploadModal();
  loadEntries();
}
