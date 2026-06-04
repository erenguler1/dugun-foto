const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxjWvRY8UZOhedYInBA5AqyOue-OWC0mgS513fRM7NpRvzFnrWlOw9YaO2A5I5OCIpk/exec";

const WEDDING_DATETIME = "2026-07-11T19:00:00+03:00";
const KINA_MAPS = "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Düzköy Öğretmen Evi Trabzon");
const DUGUN_MAPS = "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("VAV BAHÇE Aşağı Söğütönü 1040. Sokak Tepebaşı Eskişehir");

// ── Envelope cover (wax seal) ───────────────────────
const cover = document.getElementById('cover');
const sealButton = document.getElementById('sealButton');
document.body.style.overflow = 'hidden';
if (sealButton && cover) {
  sealButton.addEventListener('click', () => {
    sealButton.classList.add('breaking');
    setTimeout(() => cover.classList.add('opening'), 300);
    setTimeout(() => {
      cover.style.display = 'none';
      document.body.style.overflow = '';
      window.scrollTo(0, 0);
    }, 1150);
  });
}

const uploadButton  = document.querySelector("[data-upload-button]");
const fileInput     = document.querySelector("[data-file-input]");
const statusEl      = document.querySelector("[data-status]");
const thumbsEl      = document.querySelector("[data-thumbs]");

let resetTimer = null;

// ── Maps links ──────────────────────────────────────
document.querySelector("[data-kina-maps]").href = KINA_MAPS;
document.querySelector("[data-dugun-maps]").href = DUGUN_MAPS;

// ── Countdown ───────────────────────────────────────
const weddingTime = new Date(WEDDING_DATETIME).getTime();
const cdDaysEl    = document.querySelector("[data-cd-days]");
const cdHoursEl   = document.querySelector("[data-cd-hours]");
const cdMinutesEl = document.querySelector("[data-cd-minutes]");
const cdSecondsEl = document.querySelector("[data-cd-seconds]");

function pad(value) {
  return String(value).padStart(2, "0");
}

function updateCountdown() {
  const diff = weddingTime - Date.now();
  if (diff <= 0) {
    cdDaysEl.textContent = "00";
    cdHoursEl.textContent = "00";
    cdMinutesEl.textContent = "00";
    cdSecondsEl.textContent = "00";
    return;
  }
  cdDaysEl.textContent = pad(Math.floor(diff / 86400000));
  cdHoursEl.textContent = pad(Math.floor((diff % 86400000) / 3600000));
  cdMinutesEl.textContent = pad(Math.floor((diff % 3600000) / 60000));
  cdSecondsEl.textContent = pad(Math.floor((diff % 60000) / 1000));
}

updateCountdown();
setInterval(updateCountdown, 1000);

// ── Upload ──────────────────────────────────────────
uploadButton.addEventListener("click", () => {
  if (uploadButton.dataset.state === "uploading") return;
  fileInput.click();
});

fileInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  if (resetTimer !== null) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }

  let failureCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    setProgress(i + 1, files.length);
    try {
      await uploadFile(file);
      addThumbnail(file);
    } catch (err) {
      failureCount += 1;
    }
  }

  fileInput.value = "";

  if (failureCount === 0) {
    setState("success");
    resetTimer = setTimeout(() => {
      setState("idle");
      resetTimer = null;
    }, 2500);
  } else {
    setState("error", { failureCount, totalCount: files.length });
  }
});

async function uploadFile(file) {
  const base64 = await readAsBase64(file);
  const payload = {
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    data: base64
  };
  // text/plain keeps this a CORS "simple request" — Apps Script does not
  // handle preflight cleanly. JSON.stringify still goes in the body.
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "upload failed");
  }
  return result.fileId;
}

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      // strip the "data:<mime>;base64," prefix — Apps Script wants raw base64
      const commaIndex = dataUrl.indexOf(",");
      resolve(commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl);
    };
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function setState(state, detail) {
  uploadButton.dataset.state = state;
  statusEl.dataset.state = state;

  if (state === "idle") {
    statusEl.textContent = "";
  } else if (state === "success") {
    statusEl.textContent = "Teşekkürler";
  } else if (state === "error") {
    const failed = detail.failureCount;
    const total = detail.totalCount;
    statusEl.textContent = `${failed}/${total} fotoğraf yüklenemedi · tekrar dene`;
  }
}

function setProgress(current, total) {
  uploadButton.dataset.state = "uploading";
  statusEl.dataset.state = "uploading";
  statusEl.textContent = `${current}/${total} yükleniyor`;
}

function addThumbnail(file) {
  const url = URL.createObjectURL(file);
  const img = document.createElement("img");
  img.src = url;
  img.alt = "";
  img.className = "thumb";
  thumbsEl.appendChild(img);
}
