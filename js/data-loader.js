// data-loader.js — טוען את רשימת הקטגוריות/תבניות/גלריות מקבצי ה-JSON
// תחת data/, כדי שכולם יראו תמיד את אותו מידע עדכני, בלי תלות בדפדפן
// של מי שהוסיף.

async function loadMoldData() {
  const [catsRes, moldsRes] = await Promise.all([
    fetch("data/categories.json", { cache: "no-store" }),
    fetch("data/molds.json", { cache: "no-store" }),
  ]);
  const categories = await catsRes.json();
  const molds = await moldsRes.json();
  return { categories, molds };
}

async function loadGalleryData() {
  const [combosRes, effectsRes, patternsRes] = await Promise.all([
    fetch("data/combos.json", { cache: "no-store" }),
    fetch("data/effects.json", { cache: "no-store" }),
    fetch("data/patterns.json", { cache: "no-store" }),
  ]);
  const combos = await combosRes.json();
  const effects = await effectsRes.json();
  const patterns = await patternsRes.json();
  return { combos, effects, patterns };
}
