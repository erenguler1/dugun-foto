const APPS_SCRIPT_URL = "https://script.google.com/macros/s/REPLACE_WITH_DEPLOYMENT_ID/exec";
const COUPLE_NAMES    = "Ayşe & Mehmet";
const WEDDING_DATE    = "15 Haziran 2025";

const coupleNamesEl = document.querySelector("[data-couple-names]");
const weddingDateEl = document.querySelector("[data-wedding-date]");
const uploadButton  = document.querySelector("[data-upload-button]");
const fileInput     = document.querySelector("[data-file-input]");
const statusEl      = document.querySelector("[data-status]");
const thumbsEl      = document.querySelector("[data-thumbs]");

let resetTimer = null;

coupleNamesEl.textContent = COUPLE_NAMES;
weddingDateEl.textContent = WEDDING_DATE;

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
