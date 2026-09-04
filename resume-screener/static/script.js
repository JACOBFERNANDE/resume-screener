const form = document.getElementById("screen-form");
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("resume-input");
const fileLabel = document.getElementById("file-label");
const jobDescription = document.getElementById("job-description");
const submitBtn = document.getElementById("submit-btn");
const btnText = submitBtn.querySelector(".verdict-btn__text");
const btnSpinner = submitBtn.querySelector(".verdict-btn__spinner");
const errorMsg = document.getElementById("error-msg");
const resultEl = document.getElementById("result");

const stampNumber = document.getElementById("stamp-number");
const stamp = document.getElementById("stamp");
const rulingSummary = document.getElementById("ruling-summary");
const rulingJustification = document.getElementById("ruling-justification");
const matchedList = document.getElementById("matched-list");
const missingList = document.getElementById("missing-list");

// --- Drag & drop / click-to-browse ---
dropZone.addEventListener("click", () => fileInput.click());

["dragenter", "dragover"].forEach(evt =>
  dropZone.addEventListener(evt, e => {
    e.preventDefault();
    dropZone.classList.add("is-dragover");
  })
);
["dragleave", "drop"].forEach(evt =>
  dropZone.addEventListener(evt, e => {
    e.preventDefault();
    dropZone.classList.remove("is-dragover");
  })
);
dropZone.addEventListener("drop", e => {
  const file = e.dataTransfer.files[0];
  if (file) {
    fileInput.files = e.dataTransfer.files;
    updateFileLabel(file);
  }
});
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) updateFileLabel(fileInput.files[0]);
});

function updateFileLabel(file) {
  fileLabel.textContent = file.name;
  dropZone.classList.add("has-file");
}

// --- Submit ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const file = fileInput.files[0];
  const jd = jobDescription.value.trim();

  if (!file) return showError("Please attach a résumé PDF.");
  if (!jd) return showError("Please paste in a job description.");

  setLoading(true);
  resultEl.hidden = true;

  const formData = new FormData();
  formData.append("resume", file);
  formData.append("job_description", jd);

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Something went wrong. Please try again.");
      return;
    }

    renderResult(data);
  } catch (err) {
    showError("Could not reach the server. Please try again.");
  } finally {
    setLoading(false);
  }
});

function renderResult(data) {
  stampNumber.textContent = data.score ?? "–";
  stamp.style.borderColor = scoreColor(data.score);
  stamp.style.color = scoreColor(data.score);

  rulingSummary.textContent = data.summary || "";
  rulingJustification.textContent = data.justification || "";

  fillList(matchedList, data.matched_skills || []);
  fillList(missingList, data.missing_skills || []);

  resultEl.hidden = false;
  resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function scoreColor(score) {
  if (score >= 7) return "#5FA37A";
  if (score >= 4) return "#D9A441";
  return "#C1443C";
}

function fillList(el, items) {
  el.innerHTML = "";
  items.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  btnSpinner.hidden = !isLoading;
  btnText.textContent = isLoading ? "Reading the file…" : "Render a verdict";
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}
function hideError() {
  errorMsg.hidden = true;
}
