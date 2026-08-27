// main.js — פונקציות עזר משותפות לכל הדפים

// מחליף תמונה חסרה בריבוע placeholder עם טקסט, כדי שהאתר ייראה תקין
// גם לפני שהועלו תמונות אמיתיות.
function attachImageFallback(imgEl, label) {
  imgEl.addEventListener("error", function onErr() {
    imgEl.removeEventListener("error", onErr);
    const text = encodeURIComponent(label || "אין תמונה עדיין");
    imgEl.src =
      "data:image/svg+xml;utf8," +
      `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>` +
      `<rect width='100%' height='100%' fill='%23efe7df'/>` +
      `<text x='50%' y='50%' font-size='16' fill='%23a89b8c' text-anchor='middle' dominant-baseline='middle' font-family='Arial'>${text}</text>` +
      `</svg>`;
  });
}

// בונה סרגל ניווט תחתון ומסמן את הטאב הפעיל לפי שם הדף
function renderBottomNav(activeKey) {
  const items = [
    { key: "molds", href: "molds.html", icon: "🧱", label: "התבניות שלי" },
    { key: "inspiration", href: "inspiration.html", icon: "🎨", label: "לוחות השראה" },
    { key: "calculator", href: "calculator.html", icon: "🧮", label: "מחשבון" },
  ];
  const nav = document.createElement("nav");
  nav.className = "bottom-nav";
  nav.innerHTML = items
    .map(
      (it) =>
        `<a href="${it.href}" class="${it.key === activeKey ? "active" : ""}">` +
        `<span class="icon">${it.icon}</span><span>${it.label}</span></a>`
    )
    .join("");
  document.body.appendChild(nav);
}

// חישוב כמות בטון ומים לפי נפח (מ"ל) והגדרות התערובת ב-data.js
function calcMix(volumeMl, settings) {
  const s = settings || MIX_SETTINGS;
  const concreteG = volumeMl * s.concreteDensityGPerMl;
  const waterMl = concreteG * s.waterRatio;
  return {
    concreteG: Math.round(concreteG),
    waterMl: Math.round(waterMl),
  };
}

// מודאל גנרי: פותח/סוגר, סוגר בלחיצה על הרקע או על ESC
function setupModalClosers(overlayEl) {
  overlayEl.addEventListener("click", (e) => {
    if (e.target === overlayEl) overlayEl.classList.add("hidden");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") overlayEl.classList.add("hidden");
  });
  overlayEl.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => overlayEl.classList.add("hidden"));
  });
}

function categoryName(categories, id) {
  const c = categories.find((c) => c.id === id);
  return c ? c.name : id;
}
