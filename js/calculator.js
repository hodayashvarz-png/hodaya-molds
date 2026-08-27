// calculator.js — לוגיקת שלושת חלקי המחשבון

renderBottomNav("calculator");

// ---------- טאבים ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
  });
});

// ---------- מילוי רשימות הקטגוריות בתפריטים ----------
function fillCategorySelect(selectEl) {
  MOLD_CATEGORIES.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.name;
    selectEl.appendChild(opt);
  });
}
fillCategorySelect(document.getElementById("r-cat"));
fillCategorySelect(document.getElementById("e-cat"));

function moldsInCategory(catId) {
  return catId === "all" ? MOLDS.slice() : MOLDS.filter((m) => m.category === catId);
}

function moldLine(m) {
  return `מס' ${m.id} — ${m.description} (${m.volumeMl} מ״ל, ${categoryName(MOLD_CATEGORIES, m.category)})`;
}

// ---------- טאב 1: נפח -> בטון ומים ----------
document.getElementById("v-calc-btn").addEventListener("click", () => {
  const volume = parseFloat(document.getElementById("v-volume").value);
  const result = document.getElementById("v-result");
  if (!volume || volume <= 0) {
    result.innerHTML = `<p class="empty-note">יש להזין נפח תקין במ״ל.</p>`;
    return;
  }
  const density = parseFloat(document.getElementById("v-density").value) || MIX_SETTINGS.concreteDensityGPerMl;
  const ratio = parseFloat(document.getElementById("v-ratio").value) || MIX_SETTINGS.waterRatio;
  const mix = calcMix(volume, { concreteDensityGPerMl: density, waterRatio: ratio });

  result.innerHTML = `
    <div class="result-card">
      <div class="stat-row"><span class="label">נפח</span><span class="value">${volume} מ״ל</span></div>
      <div class="stat-row"><span class="label">בטון נדרש</span><span class="value">${mix.concreteG} גרם</span></div>
      <div class="stat-row"><span class="label">מים נדרשים</span><span class="value">${mix.waterMl} מ״ל</span></div>
    </div>`;
});

// ---------- טאב 2: שילובים אקראיים לניצול חומר גלם ----------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRandomCombo(pool, availableMl, maxSize = 5) {
  const shuffled = shuffle(pool);
  const combo = [];
  let total = 0;
  for (const m of shuffled) {
    if (combo.length >= maxSize) break;
    if (total + m.volumeMl <= availableMl) {
      combo.push(m);
      total += m.volumeMl;
    }
  }
  return { combo, total };
}

function generateRandomCombos(pool, availableMl, count) {
  const results = [];
  const seen = new Set();
  let attempts = 0;
  while (results.length < count && attempts < 300) {
    attempts++;
    const { combo, total } = buildRandomCombo(pool, availableMl);
    if (combo.length === 0) continue;
    const signature = combo
      .map((m) => m.id)
      .sort()
      .join(",");
    if (seen.has(signature)) continue;
    seen.add(signature);
    results.push({ combo, total });
  }
  return results.sort((a, b) => b.total - a.total);
}

document.getElementById("r-calc-btn").addEventListener("click", () => {
  const available = parseFloat(document.getElementById("r-volume").value);
  const catId = document.getElementById("r-cat").value;
  const result = document.getElementById("r-result");

  if (!available || available <= 0) {
    result.innerHTML = `<p class="empty-note">יש להזין נפח חומר גלם תקין במ״ל.</p>`;
    return;
  }

  const pool = moldsInCategory(catId);
  if (pool.length === 0) {
    result.innerHTML = `<p class="empty-note">אין תבניות בסיווג הזה.</p>`;
    return;
  }

  const smallest = Math.min(...pool.map((m) => m.volumeMl));
  if (smallest > available) {
    result.innerHTML = `<p class="empty-note">אין תבנית בסיווג הזה שמתאימה לכמות הזו — כל התבניות דורשות יותר חומר.</p>`;
    return;
  }

  const combos = generateRandomCombos(pool, available, 3);
  if (combos.length === 0) {
    result.innerHTML = `<p class="empty-note">לא נמצאו שילובים מתאימים, נסו כמות אחרת.</p>`;
    return;
  }

  result.innerHTML = combos
    .map((c, i) => {
      const leftover = Math.round((available - c.total) * 10) / 10;
      const mix = calcMix(c.total);
      return `<div class="result-card">
        <h3>שילוב ${i + 1} — ניצול ${c.total} מ״ל מתוך ${available} מ״ל</h3>
        <ul>${c.combo.map((m) => `<li>${moldLine(m)}</li>`).join("")}</ul>
        <div class="totals">בטון: ${mix.concreteG} גרם · מים: ${mix.waterMl} מ״ל · נותרים: ${leftover} מ״ל</div>
      </div>`;
    })
    .join("");
});

// ---------- טאב 3: תבניות נוספות לניצול שארית ----------
document.getElementById("e-calc-btn").addEventListener("click", () => {
  const available = parseFloat(document.getElementById("e-volume").value);
  const serialsRaw = document.getElementById("e-serials").value;
  const catId = document.getElementById("e-cat").value;
  const result = document.getElementById("e-result");

  if (!available || available <= 0) {
    result.innerHTML = `<p class="empty-note">יש להזין נפח חומר גלם תקין במ״ל.</p>`;
    return;
  }

  const serialIds = serialsRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const chosenMolds = [];
  const unknown = [];
  serialIds.forEach((id) => {
    const m = MOLDS.find((m) => m.id === id);
    if (m) chosenMolds.push(m);
    else unknown.push(id);
  });

  const usedVolume = chosenMolds.reduce((sum, m) => sum + m.volumeMl, 0);
  const remaining = available - usedVolume;

  let html = "";
  if (unknown.length > 0) {
    html += `<p class="empty-note">מספרים לא מזוהים: ${unknown.join(", ")}</p>`;
  }

  if (chosenMolds.length > 0) {
    html += `<div class="result-card">
      <h3>תבניות שנבחרו — סה״כ ${usedVolume} מ״ל</h3>
      <ul>${chosenMolds.map((m) => `<li>${moldLine(m)}</li>`).join("")}</ul>
    </div>`;
  }

  if (remaining <= 0) {
    html += `<p class="empty-note">הכמות שכבר נבחרה שווה או עולה על חומר הגלם הזמין — אין שארית לניצול.</p>`;
    result.innerHTML = html;
    return;
  }

  const chosenIds = new Set(chosenMolds.map((m) => m.id));
  const pool = moldsInCategory(catId).filter((m) => !chosenIds.has(m.id) && m.volumeMl <= remaining);

  if (pool.length === 0) {
    html += `<p class="empty-note">נשארו ${remaining} מ״ל, אך אין תבנית בסיווג הזה שמתאימה לשארית.</p>`;
    result.innerHTML = html;
    return;
  }

  const suggestions = pool.sort((a, b) => b.volumeMl - a.volumeMl).slice(0, 5);
  const mix = calcMix(remaining);

  html += `<div class="result-card">
    <h3>שארית לניצול: ${remaining} מ״ל (בטון: ${mix.concreteG} גרם · מים: ${mix.waterMl} מ״ל)</h3>
    <ul>${suggestions.map((m) => `<li>${moldLine(m)}</li>`).join("")}</ul>
  </div>`;

  result.innerHTML = html;
});
