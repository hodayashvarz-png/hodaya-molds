// data-loader.js — טוען את רשימת הקטגוריות והתבניות מקבצי ה-JSON
// (data/categories.json, data/molds.json) כדי שכולם יראו תמיד את
// אותו מידע עדכני, בלי תלות בדפדפן של מי שהוסיף.

async function loadMoldData() {
  const [catsRes, moldsRes] = await Promise.all([
    fetch("data/categories.json", { cache: "no-store" }),
    fetch("data/molds.json", { cache: "no-store" }),
  ]);
  const categories = await catsRes.json();
  const molds = await moldsRes.json();
  return { categories, molds };
}
