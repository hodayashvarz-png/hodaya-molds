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

(async () => {
  const { categories, molds } = await loadMoldData();

  // ---------- מילוי רשימות הקטגוריות בתפריטים ----------
  function fillCategorySelect(selectEl) {
    categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      selectEl.appendChild(opt);
    });
  }
  fillCategorySelect(document.getElementById("r-cat-a"));
  fillCategorySelect(document.getElementById("r-cat-b"));
  fillCategorySelect(document.getElementById("e-cat"));

  // טאבים 2/3 עובדים מול "כמה חומר גלם התבנית צורכת" (מ"ל בטון), לא מול
  // נפח התבנית עצמו — ולכן משתמשים רק בתבניות שיש להן נפח מוזן.
  function moldsInCategory(catId) {
    const withVolume = molds.filter((m) => m.volumeMl != null);
    return catId === "all" ? withVolume : withVolume.filter((m) => m.category === catId);
  }

  function moldConcreteMl(m) {
    return calcMix(m.volumeMl).concreteMl;
  }

  function moldLine(m) {
    return `מס' ${m.id} — ${m.description} (נפח תבנית ${m.volumeMl} מ״ל, צורך ${moldConcreteMl(m)} מ״ל בטון, ${categoryName(categories, m.category)})`;
  }

  // ---------- טאב 1: נפח -> בטון ומים ----------
  document.getElementById("v-calc-btn").addEventListener("click", () => {
    const volume = parseFloat(document.getElementById("v-volume").value);
    const result = document.getElementById("v-result");
    if (!volume || volume <= 0) {
      result.innerHTML = `<p class="empty-note">יש להזין נפח תקין במ״ל.</p>`;
      return;
    }
    const concretePerVolume = parseFloat(document.getElementById("v-density").value) || MIX_SETTINGS.concretePerVolume;
    const waterPerVolume = parseFloat(document.getElementById("v-ratio").value) || MIX_SETTINGS.waterPerVolume;
    const mix = calcMix(volume, { concretePerVolume, waterPerVolume });

    result.innerHTML = `
      <div class="result-card">
        <div class="stat-row"><span class="label">נפח</span><span class="value">${volume} מ״ל</span></div>
        <div class="stat-row"><span class="label">בטון נדרש</span><span class="value">${mix.concreteMl} מ״ל</span></div>
        <div class="stat-row"><span class="label">מים נדרשים</span><span class="value">${mix.waterMl} מ״ל</span></div>
      </div>`;
  });

  // ---------- טאב 2: שילובים לניצול מיטבי של חומר גלם ----------
  // בודקים את כל השילובים האפשריים בגודל 1 עד maxSize (לא אקראי), כדי
  // למצוא את הניצול הכי גבוה של החומר הזמין תוך שימוש בכמה שפחות תבניות:
  // ממיינים לפי (ניצול יורד, מספר פריטים עולה), כך ששני שילובים עם אותו
  // ניצול — המצומצם מביניהם עדיף.
  function categoryCapOk(items, priorityCats) {
    const counts = {};
    for (const m of items) {
      if (!priorityCats.includes(m.category)) continue;
      counts[m.category] = (counts[m.category] || 0) + 1;
      if (counts[m.category] > 1) return false;
    }
    return true;
  }

  function enumerateCombos(pool, availableMl, priorityCats, maxSize) {
    const results = [];
    const n = pool.length;

    for (let i = 0; i < n; i++) {
      const totalI = moldConcreteMl(pool[i]);
      if (totalI <= availableMl) results.push({ combo: [pool[i]], total: totalI });
      if (maxSize < 2) continue;

      for (let j = i + 1; j < n; j++) {
        if (!categoryCapOk([pool[i], pool[j]], priorityCats)) continue;
        const totalIJ = totalI + moldConcreteMl(pool[j]);
        if (totalIJ <= availableMl) results.push({ combo: [pool[i], pool[j]], total: totalIJ });
        if (maxSize < 3 || totalIJ > availableMl) continue;

        for (let k = j + 1; k < n; k++) {
          if (!categoryCapOk([pool[i], pool[j], pool[k]], priorityCats)) continue;
          const total = totalIJ + moldConcreteMl(pool[k]);
          if (total <= availableMl) results.push({ combo: [pool[i], pool[j], pool[k]], total });
        }
      }
    }
    return results;
  }

  function generateBestCombos(pool, availableMl, count, priorityCats = [], maxSize = 3) {
    const all = enumerateCombos(pool, availableMl, priorityCats, maxSize);
    all.sort((a, b) => b.total - a.total || a.combo.length - b.combo.length);

    const results = [];
    const seen = new Set();
    for (const item of all) {
      const signature = item.combo
        .map((m) => m.id)
        .sort()
        .join(",");
      if (seen.has(signature)) continue;
      seen.add(signature);
      results.push(item);
      if (results.length >= count) break;
    }
    return results;
  }

  document.getElementById("r-calc-btn").addEventListener("click", () => {
    const available = parseFloat(document.getElementById("r-volume").value);
    const catA = document.getElementById("r-cat-a").value;
    const catB = document.getElementById("r-cat-b").value;
    const priorityCats = [...new Set([catA, catB].filter((c) => c))];
    const result = document.getElementById("r-result");

    if (!available || available <= 0) {
      result.innerHTML = `<p class="empty-note">יש להזין נפח חומר גלם תקין במ״ל.</p>`;
      return;
    }

    const pool = moldsInCategory("all");
    if (pool.length === 0) {
      result.innerHTML = `<p class="empty-note">אין תבניות עם נפח מוזן.</p>`;
      return;
    }

    const smallest = Math.min(...pool.map((m) => moldConcreteMl(m)));
    if (smallest > available) {
      result.innerHTML = `<p class="empty-note">אין תבנית שמתאימה לכמות הזו — כל התבניות דורשות יותר חומר.</p>`;
      return;
    }

    const combos = generateBestCombos(pool, available, 3, priorityCats);
    if (combos.length === 0) {
      result.innerHTML = `<p class="empty-note">לא נמצאו שילובים מתאימים, נסו כמות אחרת.</p>`;
      return;
    }

    result.innerHTML = combos
      .map((c, i) => {
        const leftover = Math.round((available - c.total) * 10) / 10;
        return `<div class="result-card">
          <h3>שילוב ${i + 1} — ניצול ${c.total} מ״ל בטון מתוך ${available} מ״ל</h3>
          <ul>${c.combo.map((m) => `<li>${moldLine(m)}</li>`).join("")}</ul>
          <div class="totals">נותרים: ${leftover} מ״ל</div>
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
    const noVolume = [];
    serialIds.forEach((id) => {
      const m = molds.find((m) => m.id === id);
      if (!m) {
        unknown.push(id);
      } else if (m.volumeMl == null) {
        noVolume.push(id);
      } else {
        chosenMolds.push(m);
      }
    });

    const usedConcrete = chosenMolds.reduce((sum, m) => sum + moldConcreteMl(m), 0);
    const remaining = available - usedConcrete;

    let html = "";
    if (unknown.length > 0) {
      html += `<p class="empty-note">מספרים לא מזוהים: ${unknown.join(", ")}</p>`;
    }
    if (noVolume.length > 0) {
      html += `<p class="empty-note">לתבניות ${noVolume.join(", ")} עדיין לא הוזן נפח, אז לא ניתן לחשב אותן.</p>`;
    }

    if (chosenMolds.length > 0) {
      html += `<div class="result-card">
        <h3>תבניות שנבחרו — סה״כ ${usedConcrete} מ״ל בטון</h3>
        <ul>${chosenMolds.map((m) => `<li>${moldLine(m)}</li>`).join("")}</ul>
      </div>`;
    }

    if (remaining <= 0) {
      html += `<p class="empty-note">הכמות שכבר נבחרה שווה או עולה על חומר הגלם הזמין — אין שארית לניצול.</p>`;
      result.innerHTML = html;
      return;
    }

    const chosenIds = new Set(chosenMolds.map((m) => m.id));
    const pool = moldsInCategory(catId).filter((m) => !chosenIds.has(m.id) && moldConcreteMl(m) <= remaining);

    if (pool.length === 0) {
      html += `<p class="empty-note">נשארו ${remaining} מ״ל, אך אין תבנית בסיווג הזה שמתאימה לשארית.</p>`;
      result.innerHTML = html;
      return;
    }

    const suggestions = pool.sort((a, b) => moldConcreteMl(b) - moldConcreteMl(a)).slice(0, 5);

    html += `<div class="result-card">
      <h3>שארית לניצול: ${remaining} מ״ל בטון</h3>
      <ul>${suggestions.map((m) => `<li>${moldLine(m)}</li>`).join("")}</ul>
    </div>`;

    result.innerHTML = html;
  });
})();
