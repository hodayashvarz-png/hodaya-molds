/*
  store.js — תוספות שנשמרות בדפדפן (localStorage) בין ביקורים.
  משמש כדי לאפשר הוספת קטגוריות ותבניות ישירות דרך האתר, בלי לערוך קוד.
  שימו לב: זה נשמר רק בדפדפן הזה/במכשיר הזה. כדי שהתוספת תופיע גם
  אצל חברים, צריך לייצא אותה (admin.html) ולהוסיף ל-js/data.js בקוד.
*/

const LOCAL_STORE_KEY = "hodaya_local_data_v1";

function loadLocalStore() {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    if (!raw) return { molds: [], categories: [] };
    const parsed = JSON.parse(raw);
    return {
      molds: Array.isArray(parsed.molds) ? parsed.molds : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    };
  } catch (e) {
    return { molds: [], categories: [] };
  }
}

function saveLocalStoreData(store) {
  localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(store));
}

// מוסיף קטגוריה חדשה (אם עוד לא קיימת בשום מקום)
function addLocalCategory(name) {
  const id = (name || "").trim();
  if (!id) return null;
  if (getAllCategories().some((c) => c.id === id)) return id;
  const store = loadLocalStore();
  store.categories.push({ id, name: id });
  saveLocalStoreData(store);
  return id;
}

// מוסיף/מעדכן תבנית (לפי מספר סידורי)
function addLocalMold(mold) {
  const store = loadLocalStore();
  store.molds = store.molds.filter((m) => m.id !== mold.id);
  store.molds.push(mold);
  saveLocalStoreData(store);
}

// כל הקטגוריות: אלו שבקוד + התוספות המקומיות
function getAllCategories() {
  const local = loadLocalStore().categories;
  const merged = MOLD_CATEGORIES.slice();
  local.forEach((c) => {
    if (!merged.some((m) => m.id === c.id)) merged.push(c);
  });
  return merged;
}

// כל התבניות: אלו שבקוד + התוספות המקומיות (תבנית מקומית עם אותו מס' סידורי דורסת)
function getAllMolds() {
  const local = loadLocalStore().molds;
  const merged = MOLDS.slice();
  local.forEach((lm) => {
    const idx = merged.findIndex((m) => m.id === lm.id);
    if (idx >= 0) merged[idx] = lm;
    else merged.push(lm);
  });
  return merged;
}

function countLocalAdditions() {
  const store = loadLocalStore();
  return store.molds.length + store.categories.length;
}

function clearLocalStore() {
  localStorage.removeItem(LOCAL_STORE_KEY);
}
