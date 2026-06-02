// ── upload.js ──

const UPLOAD_METRIC_FIELDS = [
  { key: "ctr",                 label: "CTR"    },
  { key: "clicks",              label: "Clicks" },
  { key: "reach",               label: "Reach"  },
  { key: "budget_spent",        label: "Spent"  },
  { key: "total_leads",         label: "Leads"  },
  { key: "mql_leads",           label: "MQL"    },
  { key: "mql_percent",         label: "MQL%"   },
  { key: "click_to_lead_ratio", label: "C2L"    },
  { key: "webinar_booked",      label: "W.Book" },
  { key: "webinar_attended",    label: "W.Att"  },
  { key: "converted",           label: "Conv"   },
];

let _uploadRows = [];

function setupUploadDropZone() {
  const zone  = document.getElementById("json-drop-zone");
  const input = document.getElementById("json-file-input");
  input.addEventListener("change", (e) => { if (e.target.files[0]) handleJsonFile(e.target.files[0]); });
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault(); zone.classList.remove("over");
    const file = e.dataTransfer.files[0];
    if (file) handleJsonFile(file);
  });
}

function handleJsonFile(file) {
  if (!file.name.endsWith(".json")) { showToast("Please upload a .json file", "error"); return; }
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

function classifyAndPreview(jsonRows) {
  const existingMap = new Map();
  (window._allRows || []).forEach((r) => {
    existingMap.set((r.creative_name || "").trim().toLowerCase(), r);
  });

  _uploadRows = jsonRows.map((row) => {
    const name = (row.creative_name || row["Creative Name"] || row["name"] || "").trim();
    const existing = existingMap.get(name.toLowerCase());
    let status = "unmatched";
    if (existing) {
      const hasMetrics = UPLOAD_METRIC_FIELDS.some((f) => existing[f.key] != null && existing[f.key] !== "");
      status = hasMetrics ? "overwrite" : "matched";
    }
    return { ...row, _name: name, _status: status, _existing: existing || null, _allowOverwrite: false };
  });

  renderUploadPreview();
}

function renderUploadPreview() {
  const matched   = _uploadRows.filter((r) => r._status === "matched").length;
  const unmatched = _uploadRows.filter((r) => r._status === "unmatched").length;
  const overwrite = _uploadRows.filter((r) => r._status === "overwrite").length;

  document.getElementById("upload-summary-row").style.display = "flex";
  document.getElementById("upload-summary-row").innerHTML = `
    <span class="upill match">${matched} Matched</span>
    <span class="upill unmatched">${unmatched} No Match</span>
    <span class="upill overwrite">${overwrite} Will Overwrite</span>
    ${overwrite > 0 ? `<label class="allow-all-label"><input type="checkbox" id="allow-all-ow" onchange="toggleAllOverwrites(this.checked)" /> Allow all overwrites</label>` : ""}
  `;

  const tbody = document.getElementById("upload-preview-body");
  tbody.innerHTML = _uploadRows.map((row, i) => {
    const pillMap = {
      matched:   `<span class="upill match">Match</span>`,
      unmatched: `<span class="upill unmatched">No Match</span>`,
      overwrite: `<span class="upill overwrite">Overwrite</span>`,
    };
    const metricCells = UPLOAD_METRIC_FIELDS.map((f) => {
      const v = row[f.key];
      return `<td>${v != null && v !== "" ? v : "–"}</td>`;
    }).join("");
    const owCheck = row._status === "overwrite"
      ? `<input type="checkbox" data-idx="${i}" onchange="toggleRowOverwrite(${i}, this.checked)" />`
      : "";
    return `<tr class="${row._status === "unmatched" ? "upr-unmatched" : row._status === "overwrite" ? "upr-overwrite" : ""}">
      <td>${pillMap[row._status]}</td>
      <td class="upc-name">${row._name || "–"}</td>
      ${metricCells}
      <td>${owCheck}</td>
    </tr>`;
  }).join("");

  document.getElementById("upload-preview-wrap").style.display = "block";
}

function toggleRowOverwrite(idx, checked) { _uploadRows[idx]._allowOverwrite = checked; }
function toggleAllOverwrites(checked) {
  _uploadRows.forEach((r, i) => {
    if (r._status === "overwrite") {
      r._allowOverwrite = checked;
      const cb = document.querySelector(`input[data-idx="${i}"]`);
      if (cb) cb.checked = checked;
    }
  });
}

async function confirmUpload() {
  const toWrite = _uploadRows.filter((r) => {
    if (r._status === "unmatched") return false;
    if (r._status === "overwrite" && !r._allowOverwrite) return false;
    return true;
  });
  if (!toWrite.length) { showToast("Nothing to import — check matches or enable overwrites", "error"); return; }

  const btn = document.getElementById("upload-confirm-btn");
  btn.disabled = true; btn.textContent = "Importing…";

  let success = 0, failed = 0;
  for (const row of toWrite) {
    const fields = {};
    UPLOAD_METRIC_FIELDS.forEach((f) => {
      const v = row[f.key];
      if (v != null && v !== "") fields[f.key] = v;
    });
    try {
      await dbUpdateEntry(row._existing.id, fields);
      success++;
    } catch (err) {
      console.error("Failed:", row._name, err);
      failed++;
    }
  }

  btn.disabled = false; btn.textContent = "Confirm Import";
  showToast(failed ? `${success} updated, ${failed} failed` : `${success} creatives updated`, failed ? "error" : "success");
  loadEntries();

  // Reset upload UI
  _uploadRows = [];
  document.getElementById("json-file-input").value = "";
  document.getElementById("upload-file-name").textContent = "";
  document.getElementById("upload-summary-row").style.display = "none";
  document.getElementById("upload-preview-wrap").style.display = "none";
}
