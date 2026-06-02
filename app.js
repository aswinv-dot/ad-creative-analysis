// ── app.js ──

let _selectedFile = null;
let _editingId = null;
window._currentRole = "uploader";

window.addEventListener("DOMContentLoaded", () => {
  setupDropZone();
  setupUploadDropZone();
  // Read role from URL param
  const params = new URLSearchParams(window.location.search);
  const roleParam = params.get("role");
  if (roleParam && ["uploader","reviewer","analyst"].includes(roleParam)) {
    switchRole(roleParam);
  }
  loadEntries();
});

// ── Role switcher ──────────────────────────────────────────
function switchRole(role) {
  window._currentRole = role;

  // Update buttons
  document.querySelectorAll(".role-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.role === role);
  });

  // Show/hide sidebars
  const uploaderSidebar = document.getElementById("sidebar-uploader");
  const analystSidebar  = document.getElementById("sidebar-analyst");

  if (role === "reviewer") {
    uploaderSidebar.style.display = "none";
    analystSidebar.style.display  = "none";
    document.querySelector(".layout").style.gridTemplateColumns = "1fr";
  } else {
    uploaderSidebar.style.display = role === "uploader" ? "flex" : "none";
    analystSidebar.style.display  = role === "analyst"  ? "flex" : "none";
    document.querySelector(".layout").style.gridTemplateColumns = "var(--sidebar-w) 1fr";
  }


  // Update URL param without reload
  const url = new URL(window.location);
  url.searchParams.set("role", role);
  window.history.replaceState({}, "", url);

  // Re-render table with role-appropriate buttons
  applyFilters();
}

// ── Load entries ───────────────────────────────────────────
async function loadEntries() {
  try {
    const rows = await dbLoadEntries();
    window._allRows = rows;
    applyFilters();
  } catch (err) {
    showToast("Load error: " + err.message, "error");
  }
}

// ── Submit (uploader) ──────────────────────────────────────
async function submitEntry() {
  const name = document.getElementById("creative-name").value.trim();
  if (!name) { showToast("Creative name is required", "error"); return; }

  const notes   = document.getElementById("notes").value.trim();
  const tag     = document.getElementById("program-tag").value;
  const month   = document.getElementById("month").value.trim();

  const btn = document.getElementById("submit-btn");
  btn.disabled = true; btn.textContent = _editingId ? "Updating…" : "Saving…";

  try {
    let imageUrl = null;
    if (_selectedFile) imageUrl = await dbUploadImage(_selectedFile);

    const fields = {
      creative_name: name,
      notes,
      program_tag:  tag || null,
      month:        month || null,
      approval:     "Pending",
    };
    if (imageUrl) fields.image_url = imageUrl;

    if (_editingId) {
      await dbUpdateEntry(_editingId, fields);
      showToast("Creative updated", "success");
    } else {
      fields.created_at = new Date().toISOString();
      if (!imageUrl) fields.image_url = null;
      await dbInsertEntry(fields);
      showToast("Creative saved", "success");
    }

    resetForm();
    loadEntries();
  } catch (err) {
    showToast("Error: " + err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "Save Creative";
  }
}

// ── Edit mode (uploader) ───────────────────────────────────
function startEdit(id) {
  const row = window._allRows.find((r) => r.id === id);
  if (!row) return;
  _editingId = id;

  document.getElementById("creative-name").value  = row.creative_name || "";
  document.getElementById("notes").value           = row.notes || "";
  document.getElementById("program-tag").value     = row.program_tag || "";
  document.getElementById("month").value           = row.month || "";

  if (row.image_url) {
    document.getElementById("preview-img").src = row.image_url;
    document.getElementById("preview-name").textContent = "Current image";
    document.getElementById("preview-wrap").style.display = "flex";
  }

  const label = document.getElementById("form-mode-label");
  label.textContent = "✏ Editing";
  label.classList.add("edit-mode");

  document.getElementById("submit-btn").textContent = "Update Creative";
  document.getElementById("cancel-btn").style.display = "block";
  document.getElementById("sidebar-uploader").scrollTop = 0;
  showToast("Editing: " + row.creative_name, "info");
}

function cancelEdit() { resetForm(); }

function resetForm() {
  _editingId = null; _selectedFile = null;
  document.getElementById("creative-name").value = "";
  document.getElementById("notes").value          = "";
  document.getElementById("program-tag").value    = "";
  document.getElementById("month").value          = "";
  document.getElementById("image-input").value    = "";
  document.getElementById("preview-wrap").style.display = "none";
  const label = document.getElementById("form-mode-label");
  label.textContent = "+ New Creative";
  label.classList.remove("edit-mode");
  document.getElementById("submit-btn").textContent = "Save Creative";
  document.getElementById("cancel-btn").style.display = "none";
}

// ── Delete ─────────────────────────────────────────────────
async function deleteEntry(id) {
  if (!confirm("Delete this creative permanently?")) return;
  try {
    await dbDeleteEntry(id);
    showToast("Deleted", "success");
    loadEntries();
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
  }
}

// ── Drop zone ──────────────────────────────────────────────
function setupDropZone() {
  const zone  = document.getElementById("drop-zone");
  const input = document.getElementById("image-input");
  input.addEventListener("change", (e) => handleFile(e.target.files[0]));
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault(); zone.classList.remove("over");
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
