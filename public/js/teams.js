"use strict";
/* F1 チームカラー定義と、ドライバー→チーム→色 のヘルパー。
   teamdata.js（window.TEAM_DATA: 年→ドライバー→チーム名）と組み合わせて使う。 */

// 各コンストラクター（チーム）の代表カラー。2000-2026に登場する全39チーム。
const TEAM_COLORS = {
  "Ferrari": "#E8002D",
  "Mercedes": "#27F4D2",
  "Red Bull": "#3671C6",
  "McLaren": "#FF8000",
  "Williams": "#41B6E6",
  "Aston Martin": "#229971",
  "Alpine F1 Team": "#0090D0",
  "RB F1 Team": "#6692FF",
  "AlphaTauri": "#2B4562",
  "Toro Rosso": "#4E6FB0",
  "Alfa Romeo": "#AD2E40",
  "Sauber": "#52E252",
  "BMW Sauber": "#0054A6",
  "Haas F1 Team": "#C9CCD1",
  "Renault": "#FFE800",
  "Benetton": "#0B63A6",
  "Lotus F1": "#C9A227",
  "Lotus": "#FFB800",
  "Force India": "#FF80C7",
  "Racing Point": "#EC6FB0",
  "Toyota": "#EB0A1E",
  "Honda": "#2D9CDB",
  "BAR": "#D40000",
  "Jaguar": "#0A4D2E",
  "Jordan": "#FFD800",
  "Minardi": "#6E7176",
  "Brawn": "#B6FF00",
  "Caterham": "#0A653A",
  "Marussia": "#B10E1F",
  "Manor Marussia": "#D6001C",
  "Virgin": "#D6121E",
  "HRT": "#B0103A",
  "Super Aguri": "#E2001A",
  "Spyker": "#FF6A00",
  "Spyker MF1": "#E2530B",
  "Prost": "#0046AD",
  "Arrows": "#FA9E1B",
  "Audi": "#BB0A30",
  "Cadillac F1 Team": "#B68A3E",
};

const DEFAULT_TEAM_COLOR = "#8b93a1";

// チーム略称（バッジ表示用・3文字前後）
const TEAM_ABBR = {
  "Ferrari": "FER", "Mercedes": "MER", "Red Bull": "RBR", "McLaren": "MCL",
  "Williams": "WIL", "Aston Martin": "AMR", "Alpine F1 Team": "ALP", "RB F1 Team": "RB",
  "AlphaTauri": "AT", "Toro Rosso": "STR", "Alfa Romeo": "ALF", "Sauber": "SAU",
  "BMW Sauber": "BMW", "Haas F1 Team": "HAA", "Renault": "REN", "Benetton": "BEN",
  "Lotus F1": "LOT", "Lotus": "LOT", "Force India": "FI", "Racing Point": "RP",
  "Toyota": "TOY", "Honda": "HON", "BAR": "BAR", "Jaguar": "JAG", "Jordan": "JOR",
  "Minardi": "MIN", "Brawn": "BGP", "Caterham": "CAT", "Marussia": "MRU",
  "Manor Marussia": "MNR", "Virgin": "VIR", "HRT": "HRT", "Super Aguri": "SAG",
  "Spyker": "SPY", "Spyker MF1": "MF1", "Prost": "PRO", "Arrows": "ARW",
  "Audi": "AUD", "Cadillac F1 Team": "CAD",
};

/** チームの略称を返す（不明なら "—"） */
function teamAbbr(driver, season) {
  return TEAM_ABBR[teamOf(driver, season)] || "—";
}

/** 背景色に対して読みやすい文字色（黒/白）を相対輝度から選ぶ */
function textOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  // sRGB相対輝度
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#11141a" : "#ffffff";
}

/** 指定年のドライバーの所属チーム名を返す（不明なら ""） */
function teamOf(driver, season) {
  const y = window.TEAM_DATA && window.TEAM_DATA[String(season)];
  return (y && y[driver]) || "";
}

/** 指定年のドライバーのチームカラーを返す（不明なら既定グレー） */
function teamColor(driver, season) {
  return TEAM_COLORS[teamOf(driver, season)] || DEFAULT_TEAM_COLOR;
}
