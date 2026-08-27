/*
  data.js — כל המידע של האתר נמצא כאן.
  אפשר לערוך קובץ זה ידנית כדי להוסיף/לשנות תבניות, קטגוריות, תמונות וצבעים.
  ראו הוראות מלאות ב-README.md ובעמוד admin.html (שם אפשר "לבנות" את הבלוק
  הנכון להעתקה במקום לכתוב אותו ידנית).
*/

// ---------- קבועים לחישוב בטון ומים ----------
// אפשר לכייל את המספרים האלה לפי המתכון האמיתי שבו את משתמשת.
const MIX_SETTINGS = {
  concreteDensityGPerMl: 1.9, // כמה גרם אבקת בטון/גבס לכל מ"ל נפח תבנית
  waterRatio: 0.18, // כמה מים (יחסית למשקל האבקה) — 0.18 = 18%
};

// ---------- קטגוריות (סיווגים) של תבניות ----------
// כל קטגוריה = { id, name }. ה-id משמש בקישורים (mold-category.html?cat=...)
const MOLD_CATEGORIES = [
  { id: "kaarot", name: "קערות" },
  { id: "agartalim", name: "אגרטלים" },
  { id: "takshitim", name: "תכשיטים" },
];

// ---------- תבניות ----------
// כל תבנית: id (מספר סידורי, ייחודי), category (id של קטגוריה),
// description (תיאור קצר), image (נתיב לתמונה), volumeMl (נפח כולל במ"ל)
const MOLDS = [
  {
    id: "101",
    category: "kaarot",
    description: "קערה עגולה קטנה",
    image: "images/molds/101.jpg",
    volumeMl: 350,
  },
  {
    id: "102",
    category: "kaarot",
    description: "קערה אליפטית שטוחה",
    image: "images/molds/102.jpg",
    volumeMl: 520,
  },
  {
    id: "103",
    category: "kaarot",
    description: "קערה עמוקה מחורצת",
    image: "images/molds/103.jpg",
    volumeMl: 780,
  },
  {
    id: "201",
    category: "agartalim",
    description: "אגרטל צר וגבוה",
    image: "images/molds/201.jpg",
    volumeMl: 600,
  },
  {
    id: "202",
    category: "agartalim",
    description: "אגרטל גיאומטרי",
    image: "images/molds/202.jpg",
    volumeMl: 940,
  },
  {
    id: "301",
    category: "takshitim",
    description: "תליון עגול קטן",
    image: "images/molds/301.jpg",
    volumeMl: 15,
  },
  {
    id: "302",
    category: "takshitim",
    description: "עגילים משולשים (זוג)",
    image: "images/molds/302.jpg",
    volumeMl: 10,
  },
  {
    id: "303",
    category: "takshitim",
    description: "טבעת מעוצבת",
    image: "images/molds/303.jpg",
    volumeMl: 6,
  },
];

// ---------- לוחות השראה: צבעים ----------
// hex לצורך הצגת הריבוע, ו-mixTip הסבר קצר (כמה מילים) איך לערבב
const COLORS = [
  {
    id: "terracotta",
    name: "טרקוטה",
    hex: "#B5603A",
    mixTip: "כפית אבקת פיגמנט טרקוטה לכל כ-500 מ״ל בטון לבן, להוסיף בהדרגה.",
  },
  {
    id: "sage",
    name: "ירוק מרווה",
    hex: "#9CAF88",
    mixTip: "קצה כפית פיגמנט ירוק לכל כ-500 מ״ל בטון לבן, לערבב היטב ולבדוק גוון.",
  },
  {
    id: "charcoal",
    name: "אפור פחם",
    hex: "#3B3B3B",
    mixTip: "כפית וחצי פיגמנט שחור לכל כ-500 מ״ל בטון לבן, להוסיף בהדרגה עד לגוון.",
  },
  {
    id: "dusty-pink",
    name: "ורוד פודרה",
    hex: "#D9A6A0",
    mixTip: "קורט קטן של פיגמנט אדום/ורוד לכל כ-500 מ״ל בטון לבן, להוסיף מעט מעט.",
  },
  {
    id: "mustard",
    name: "חרדל",
    hex: "#C9A227",
    mixTip: "כפית אבקת פיגמנט צהוב-חרדל לכל כ-500 מ״ל בטון לבן, לערבב עד גוון אחיד.",
  },
  {
    id: "navy",
    name: "כחול נייבי",
    hex: "#2C3E50",
    mixTip: "כפית פיגמנט כחול כהה לכל כ-500 מ״ל בטון לבן, להוסיף בהדרגה ולבחוש.",
  },
];

// ---------- לוחות השראה: שילובי צבעים (גלריית תמונות) ----------
const COLOR_COMBOS = [
  // { id, caption, image }
  // דוגמה: { id: "combo-1", caption: "טרקוטה + אפור", image: "images/combos/combo-1.jpg" },
];

// ---------- לוחות השראה: אפקטים ----------
const EFFECTS = {
  marble: [
    // { id, caption, image }
  ],
  terrazzo: [
    // { id, caption, image }
  ],
};

// ---------- לוחות השראה: דוגמאות שונות ----------
const PATTERNS = [
  // { id, caption, image }
];
