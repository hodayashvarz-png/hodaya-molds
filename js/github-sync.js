// github-sync.js — כתיבה ישירה לריפו בגיטהאב דרך ה-API, כדי ששמירה
// מ-admin.html תהיה מיד חיה לכולם (אחרי שגיטהאב פייג'ז מסיים לבנות
// מחדש, כדקה בערך). הטוקן נשמר רק ב-localStorage של הדפדפן הזה
// ונשלח רק ישירות ל-api.github.com — לא עובר דרך שום שרת אחר.

const GH_OWNER = "hodayashvarz-png";
const GH_REPO = "hodaya-molds";
const GH_BRANCH = "main";
const GH_TOKEN_KEY = "hodaya_gh_token";

function getGhToken() {
  return localStorage.getItem(GH_TOKEN_KEY) || "";
}

function setGhToken(token) {
  localStorage.setItem(GH_TOKEN_KEY, (token || "").trim());
}

function clearGhToken() {
  localStorage.removeItem(GH_TOKEN_KEY);
}

function ghHeaders() {
  const token = getGhToken();
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ממיר מחרוזת UTF-8 ל-base64 (btoa רגיל לא תומך בעברית ישירות)
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

// שולף קובץ קיים מהריפו. מחזיר null אם הוא לא קיים.
async function ghGetFile(path) {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw await ghError(res);
  const data = await res.json();
  return { sha: data.sha, contentBase64: data.content };
}

async function ghError(res) {
  let detail = "";
  try {
    const body = await res.json();
    detail = body.message || "";
  } catch (e) {
    // אין תוכן JSON
  }
  let err;
  if (res.status === 401) err = new Error("הטוקן לא תקין או פג תוקף. יש ליצור טוקן חדש.");
  else if (res.status === 403) err = new Error("אין לטוקן הזה הרשאת כתיבה לריפו הזה.");
  else if (res.status === 409) err = new Error("מישהו/משהו אחר עדכן את הקובץ במקביל. נסו שוב.");
  else err = new Error(`שגיאה מול גיטהאב (${res.status}): ${detail || res.statusText}`);
  err.status = res.status;
  return err;
}

// כותב/מעדכן קובץ טקסט (contentString) בריפו.
async function ghPutTextFile(path, contentString, message, sha) {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`;
  const body = {
    message,
    content: utf8ToBase64(contentString),
    branch: GH_BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await ghError(res);
  return res.json();
}

// כותב קובץ בינארי (למשל תמונה) מתוך base64 (בלי ה-prefix של data:...)
async function ghPutBinaryFile(path, base64Content, message, sha) {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`;
  const body = {
    message,
    content: base64Content,
    branch: GH_BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await ghError(res);
  return res.json();
}

// מוחק קובץ מהריפו (למשל תמונה). לא זורק שגיאה אם הקובץ כבר לא קיים.
async function ghDeleteFile(path, message) {
  const existing = await ghGetFile(path);
  if (!existing) return;
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha: existing.sha, branch: GH_BRANCH }),
  });
  if (!res.ok) throw await ghError(res);
  return res.json();
}

async function ghGetJSON(path) {
  const file = await ghGetFile(path);
  if (!file) return { data: null, sha: null };
  const text = decodeURIComponent(escape(atob(file.contentBase64.replace(/\n/g, ""))));
  return { data: JSON.parse(text), sha: file.sha };
}

async function ghPutJSON(path, obj, message, sha) {
  const text = JSON.stringify(obj, null, 2) + "\n";
  return ghPutTextFile(path, text, message, sha);
}

// קורא-משנה-כותב עם הגנה מפני התנגשות: אם בין הקריאה לכתיבה מישהו/משהו
// אחר עדכן את אותו קובץ JSON (409), קוראים מחדש את הגרסה הכי עדכנית,
// מפעילים שוב את updateFn עליה, ומנסים לכתוב שוב (עד כמה ניסיונות).
// updateFn מקבל את הנתונים הנוכחיים (או null אם הקובץ לא קיים) ומחזיר
// את הנתונים החדשים לשמירה.
async function ghUpdateJSON(path, updateFn, message) {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, sha } = await ghGetJSON(path);
    const updated = await updateFn(data);
    try {
      return await ghPutJSON(path, updated, message, sha);
    } catch (err) {
      if (err.status === 409 && attempt < maxAttempts) continue;
      throw err;
    }
  }
}

// קורא קובץ תמונה מהדפדפן (File) ומחזיר את חלק ה-base64 בלבד
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result; // "data:image/jpeg;base64,AAAA..."
      const base64 = result.slice(result.indexOf(",") + 1);
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
