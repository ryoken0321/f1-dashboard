"use strict";
/* 全画面で共通のヘルパー（CSV パース・ステータス表示・HTML エスケープ・Chart.js の既定値）。
   各画面のスクリプトより先に読み込む。 */

// Chart.js ダークテーマの既定値（Chart.js を読み込んでいない画面では何もしない）
if (window.Chart) {
  Chart.defaults.color = "#aeb6c2";
  Chart.defaults.font.family = "'Noto Sans JP', system-ui, sans-serif";
  Chart.defaults.borderColor = "rgba(255,255,255,0.07)";
}

/**
 * CSV テキストを { headers, rows } にパースする。
 * "..." で囲まれた値（カンマ・改行・"" を含む）にも対応する。空行は無視。
 */
function parseCsv(text) {
  const records = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      records.push(row); row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); records.push(row); }

  const lines = records
    .filter((r) => !(r.length === 1 && r[0].trim() === ""))
    .map((r) => r.map((c) => c.trim()));
  if (lines.length === 0) return { headers: [], rows: [] };
  return { headers: lines[0], rows: lines.slice(1) };
}

/** CSV テキストを行(配列の配列)にパース。1行目(ヘッダー)は除く。 */
function parseCsvRows(text) {
  return parseCsv(text).rows;
}

/** 値の配列を CSV の1行にする（カンマ・"・改行を含む値は "..." で囲む） */
function toCsvLine(fields) {
  return fields.map((f) => {
    const s = String(f);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",");
}

/** innerHTML に差し込む文字列をエスケープする（API のデータをそのまま HTML にしない） */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/** ページ上部のステータス欄（#status）にメッセージを出す */
function showStatus(message, isError = false) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = message;
  statusEl.classList.remove("hidden");
  statusEl.classList.toggle("error", isError);
}
function clearStatus() { document.getElementById("status").classList.add("hidden"); }
