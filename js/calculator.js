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
  // בעיית "תרמיל" (knapsack) קלאסית: מוצאים את קבוצת-המשנה של התבניות
  // שמנצלת הכי הרבה מהחומר הזמין (בלי חריגה), ומבין הפתרונות שמנצלים
  // הכי הרבה — מעדיפים את זה עם הכי מעט תבניות. אין הגבלה על מספר
  // הפריטים בשילוב; אם צריך 10 תבניות כדי להגיע לניצול המקסימלי, זה בסדר.
  // תמיכה ב"עדיפות" קטגוריה: לכל קטגוריית עדיפות שנבחרה, מותר לכל היותר
  // תבנית אחת ממנה בשילוב — זה נשמר כביט נפרד ב-state של ה-DP.
  function knapsackBestCombo(pool, availableMl, priorityCats) {
    const capacity = Math.max(0, Math.floor(availableMl));
    const numMasks = 1 << priorityCats.length;

    // כל תא נושא גם reachable: mask=0 מתחיל תמיד "הושג" (שילוב ריק תקין
    // עם 0 קטגוריות עדיפות בשימוש); כל מסכה אחרת מתחילה "לא הושגה" —
    // היא הופכת reachable רק דרך מעבר אמיתי של פריט מהקטגוריה המתאימה.
    // בלי זה, "שילוב ריק" בכל המסכות היה מאפשר לפריטים לא-עדיפות
    // "להצטרף" למסכת עדיפות בלי שאף פריט עדיפות נכלל בפועל.
    const makeRow = (reachableDefault) => {
      const row = new Array(capacity + 1);
      for (let c = 0; c <= capacity; c++) row[c] = { total: 0, count: 0, items: null, reachable: reachableDefault };
      return row;
    };

    let dp = [];
    for (let mask = 0; mask < numMasks; mask++) dp.push(makeRow(mask === 0));

    for (const m of pool) {
      const w = moldConcreteMl(m);
      if (w > capacity) continue;
      const priIdx = priorityCats.indexOf(m.category);
      const bit = priIdx >= 0 ? 1 << priIdx : 0;

      const dpPrev = dp;
      const dpNext = dp.map((row) => row.slice());

      for (let mask = 0; mask < numMasks; mask++) {
        if (bit && mask & bit) continue; // הקטגוריה הזו כבר נוצלה במסלול הזה
        const targetMask = mask | bit;
        for (let c = w; c <= capacity; c++) {
          const prevCell = dpPrev[mask][c - w];
          if (!prevCell.reachable) continue; // אי אפשר להרחיב ממצב שלא הושג
          const candidateTotal = prevCell.total + w;
          const candidateCount = prevCell.count + 1;
          const current = dpNext[targetMask][c];
          const better =
            !current.reachable ||
            candidateTotal > current.total ||
            (candidateTotal === current.total && candidateCount < current.count);
          if (better) {
            dpNext[targetMask][c] = {
              total: candidateTotal,
              count: candidateCount,
              items: { mold: m, prev: prevCell.items },
              reachable: true,
            };
          }
        }
      }

      dp = dpNext;
    }

    // בוחרים את המצב הסופי הכי טוב: קודם כל מעדיפים לייצג כמה שיותר
    // מהעדיפויות שנבחרו (אפילו במחיר ניצול/מספר פריטים פחות אופטימלי),
    // ורק בין שילובים ששווים בזה — משווים לפי ניצול ואז מספר פריטים.
    const popcount = (n) => {
      let c = 0;
      while (n) {
        c += n & 1;
        n >>= 1;
      }
      return c;
    };

    let best = dp[0][capacity];
    let bestPopcount = 0;
    for (let mask = 1; mask < numMasks; mask++) {
      const cell = dp[mask][capacity];
      if (!cell.reachable) continue; // המסכה הזו לא הושגה בפועל
      const pc = popcount(mask);
      const better =
        pc > bestPopcount ||
        (pc === bestPopcount && (cell.total > best.total || (cell.total === best.total && cell.count < best.count)));
      if (better) {
        best = cell;
        bestPopcount = pc;
      }
    }

    const combo = [];
    for (let node = best.items; node; node = node.prev) combo.push(node.mold);
    return { combo, total: best.total };
  }

  // מריצים knapsack, ואז מוציאים את התבניות שנבחרו מהמאגר ומריצים שוב,
  // כדי לקבל כמה הצעות שונות (כל אחת אופטימלית ביחס למה שנשאר במאגר).
  function generateBestCombos(pool, availableMl, count, priorityCats = []) {
    const results = [];
    let remainingPool = pool;
    for (let i = 0; i < count; i++) {
      const { combo, total } = knapsackBestCombo(remainingPool, availableMl, priorityCats);
      if (combo.length === 0) break;
      results.push({ combo, total });
      const usedIds = new Set(combo.map((m) => m.id));
      remainingPool = remainingPool.filter((m) => !usedIds.has(m.id));
    }
    return results;
  }

  // לחיצה חוזרת על "הצע 3 שילובים" עם אותה כמות ואותן עדיפויות תציע
  // שילובים אחרים: זוכרים אילו תבניות כבר הוצעו וממשיכים משם, ומתחילים
  // מחדש רק כשהכמות/העדיפויות משתנות, או כשנגמרות תבניות חדשות להציע.
  let excludedMoldIds = new Set();
  let lastRequestKey = null;

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

    const requestKey = `${available}|${priorityCats.join(",")}`;
    if (requestKey !== lastRequestKey) {
      lastRequestKey = requestKey;
      excludedMoldIds = new Set();
    }

    let freshPool = pool.filter((m) => !excludedMoldIds.has(m.id));
    let combos = generateBestCombos(freshPool, available, 3, priorityCats);
    if (combos.length === 0) {
      // עברנו על כל התבניות שאפשר — מתחילים מחדש מההתחלה
      excludedMoldIds = new Set();
      combos = generateBestCombos(pool, available, 3, priorityCats);
    }
    combos.forEach((c) => c.combo.forEach((m) => excludedMoldIds.add(m.id)));

    if (combos.length === 0) {
      result.innerHTML = `<p class="empty-note">לא נמצאו שילובים מתאימים, נסו כמות אחרת.</p>`;
      return;
    }

    result.innerHTML = combos
      .map((c, i) => {
        const leftover = Math.round((available - c.total) * 10) / 10;
        return `<div class="result-card">
          <h3>שילוב ${i + 1} — ניצול ${c.total} מ״ל בטון מתוך ${available} מ״ל</h3>
          <ul class="combo-list">${c.combo
            .map(
              (m) => `<li class="combo-item">
                <img class="combo-item-img" src="${m.image}" alt="" onerror="moldImgFallback(this, '')" />
                <span>${moldLine(m)}</span>
              </li>`
            )
            .join("")}</ul>
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
