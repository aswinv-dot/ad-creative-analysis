// ── app.js — Main orchestration: form, submit, edit, delete, load ──

let _selectedFile = null;
let _editingId = null; // null = add mode, string = edit mode

// ── Init ───────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  setupDropZone();
  loadEntries();
});

// ── Load entries from DB ───────────────────────────────────
async function loadEntries() {
  try {
    const rows = await dbLoadEntries();
    window._allRows = rows;
    populateTagFilters(rows);
    applyFilters();
  } catch (err) {
    console.error(err);
    showToast("Load error: " + err.message, "error");
  }
}

// ── Submit (add or update) ─────────────────────────────────
async function submitEntry() {
  const name = document.getElementById("creative-name").value.trim();
  if (!name) { showToast("Creative name is required", "error"); return; }

  const approval = document.getElementById("approval").value;
  const notes    = document.getElementById("notes").value.trim();
  const bl       = document.getElementById("bl-score").value.trim();
  const pr       = document.getElementById("pr-score").value.trim();
  const ta       = document.getElementById("ta-score").value.trim();
  const tag      = document.getElementById("program-tag").value.trim();

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.textContent = _editingId ? "Updating…" : "Saving…";

  try {
    let imageUrl = null;

    if (_selectedFile) {
      imageUrl = await dbUploadImage(_selectedFile);
    }

    const fields = {
      creative_name: name,
      approval,
      notes,
      bl_score: bl !== "" ? bl : null,
      pr_score: pr !== "" ? pr : null,
      ta_score: ta !== "" ? ta : null,
      program_tag: tag || null,
    };

    if (imageUrl) fields.image_url = imageUrl;

    if (_editingId) {
      // In edit mode, only overwrite image_url if a new file was chosen
      await dbUpdateEntry(_editingId, fields);
      showToast("Entry updated", "success");
    } else {
      fields.created_at = new Date().toISOString();
      if (!imageUrl) fields.image_url = null;
      await dbInsertEntry(fields);
      showToast("Entry saved", "success");
    }

    resetForm();
    loadEntries();
  } catch (err) {
    console.error(err);
    showToast("Error: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Entry";
  }
}

// ── Edit mode ──────────────────────────────────────────────
function startEdit(id) {
  const row = window._allRows.find((r) => r.id === id);
  if (!row) return;

  _editingId = id;

  // Populate form
  document.getElementById("creative-name").value = row.creative_name || "";
  document.getElementById("approval").value       = row.approval || "Pending";
  document.getElementById("notes").value          = row.notes || "";
  document.getElementById("bl-score").value       = row.bl_score ?? "";
  document.getElementById("pr-score").value       = row.pr_score ?? "";
  document.getElementById("ta-score").value       = row.ta_score ?? "";
  document.getElementById("program-tag").value    = row.program_tag || "";

  // Show existing image as preview if available
  if (row.image_url) {
    document.getElementById("preview-img").src = row.image_url;
    document.getElementById("preview-name").textContent = "Current image (upload new to replace)";
    document.getElementById("preview-wrap").style.display = "flex";
  } else {
    document.getElementById("preview-wrap").style.display = "none";
  }

  // UI updates
  const label = document.getElementById("form-mode-label");
  label.textContent = "✏ Editing Entry";
  label.classList.add("edit-mode");

  document.getElementById("submit-btn").textContent = "Update Entry";
  document.getElementById("cancel-btn").style.display = "block";

  // Scroll sidebar to top
  document.querySelector(".sidebar").scrollTop = 0;

  showToast("Editing: " + row.creative_name, "info");
}

function cancelEdit() {
  resetForm();
  showToast("Edit cancelled", "");
}

// ── Delete ─────────────────────────────────────────────────
async function deleteEntry(id) {
  if (!confirm("Delete this entry permanently?")) return;
  try {
    await dbDeleteEntry(id);
    showToast("Entry deleted", "success");
    loadEntries();
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
  }
}

// ── Reset form ─────────────────────────────────────────────
function resetForm() {
  _editingId = null;
  _selectedFile = null;

  document.getElementById("creative-name").value = "";
  document.getElementById("approval").value       = "Pending";
  document.getElementById("notes").value          = "";
  document.getElementById("bl-score").value       = "";
  document.getElementById("pr-score").value       = "";
  document.getElementById("ta-score").value       = "";
  document.getElementById("program-tag").value    = "";
  document.getElementById("image-input").value    = "";
  document.getElementById("preview-wrap").style.display = "none";

  const label = document.getElementById("form-mode-label");
  label.textContent = "+ New Entry";
  label.classList.remove("edit-mode");

  document.getElementById("submit-btn").textContent = "Save Entry";
  document.getElementById("cancel-btn").style.display = "none";
}

// ── Drop zone setup ────────────────────────────────────────
function setupDropZone() {
  const zone  = document.getElementById("drop-zone");
  const input = document.getElementById("image-input");

  input.addEventListener("change", (e) => handleFile(e.target.files[0]));

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("over");
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  });
}

function handleFile(file) {
  if (!file) return;
  _selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("preview-img").src = e.target.result;
    document.getElementById("preview-name").textContent = file.name;
    document.getElementById("preview-wrap").style.display = "flex";
    if (!document.getElementById("creative-name").value) {
      document.getElementById("creative-name").value = file.name.replace(/\.[^/.]+$/, "");
    }
  };
  reader.readAsDataURL(file);
}
