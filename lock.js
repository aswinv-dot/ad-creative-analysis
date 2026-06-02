// ── lock.js — Password gate ──
// Set your SHA-256 hash of the password here.
// Generate at: https://emn178.github.io/online-tools/sha256.html
// REPLACE the hash below with your own — never put the plain password here.

const PASSWORD_HASH = "931a0feb4735ea44b51dd37101c0bfa70dfc63f226127028eb8455a3d1af91e0";
const SESSION_KEY   = "asl_auth";

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function tryUnlock() {
  const input = document.getElementById("lock-input").value;
  const btn   = document.getElementById("lock-btn");
  const err   = document.getElementById("lock-error");
  if (!input) return;

  btn.disabled = true;
  const hash = await sha256(input);

  if (hash === PASSWORD_HASH) {
    sessionStorage.setItem(SESSION_KEY, "1");
    const screen = document.getElementById("lock-screen");
    screen.style.opacity = "0";
    setTimeout(() => screen.remove(), 300);
  } else {
    err.textContent = "Incorrect password";
    const box = document.getElementById("lock-box");
    box.classList.add("shake");
    setTimeout(() => box.classList.remove("shake"), 500);
    document.getElementById("lock-input").value = "";
    btn.disabled = false;
  }
}

function renderLock() {
  if (sessionStorage.getItem(SESSION_KEY) === "1") return;

  const screen = document.createElement("div");
  screen.id = "lock-screen";
  screen.innerHTML = `
    <div id="lock-box">
      <div class="lock-logo">▣</div>
      <div class="lock-title">SIGN-OFF LOG</div>
      <div class="lock-sub">Enter team password to continue</div>
      <input id="lock-input" type="password" placeholder="Password"
        autocomplete="current-password"
        onkeydown="if(event.key==='Enter') tryUnlock()" />
      <button id="lock-btn" onclick="tryUnlock()">Enter</button>
      <div id="lock-error"></div>
    </div>`;
  document.body.appendChild(screen);
  // autofocus after append
  setTimeout(() => document.getElementById("lock-input")?.focus(), 50);
}

// Wait for body to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderLock);
} else {
  renderLock();
}
const SESSION_KEY   = "asl_auth";

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function tryUnlock() {
  const input = document.getElementById("lock-input").value;
  const btn   = document.getElementById("lock-btn");
  const err   = document.getElementById("lock-error");
  if (!input) return;

  btn.disabled = true;
  const hash = await sha256(input);

  if (hash === PASSWORD_HASH) {
    sessionStorage.setItem(SESSION_KEY, "1");
    document.getElementById("lock-screen").style.opacity = "0";
    setTimeout(() => document.getElementById("lock-screen").remove(), 300);
  } else {
    err.textContent = "Incorrect password";
    const box = document.getElementById("lock-box");
    box.classList.add("shake");
    setTimeout(() => box.classList.remove("shake"), 500);
    document.getElementById("lock-input").value = "";
    btn.disabled = false;
  }
}

function initLock() {
  if (sessionStorage.getItem(SESSION_KEY) === "1") return;

  const screen = document.createElement("div");
  screen.id = "lock-screen";
  screen.innerHTML = `
    <div id="lock-box">
      <div class="lock-logo">▣</div>
      <div class="lock-title">SIGN-OFF LOG</div>
      <div class="lock-sub">Enter team password to continue</div>
      <input id="lock-input" type="password" placeholder="Password" autocomplete="current-password"
        onkeydown="if(event.key==='Enter') tryUnlock()" autofocus />
      <button id="lock-btn" onclick="tryUnlock()">Enter</button>
      <div id="lock-error"></div>
    </div>`;
  document.body.appendChild(screen);
}

initLock();
