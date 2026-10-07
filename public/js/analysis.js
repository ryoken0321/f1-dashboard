"use strict";
/* 分析画面：チームメイト対決(h2h) / 接戦度・首位交代(drama) を切替表示。 */

const seasonSel = document.getElementById("seasonSel");
const seasonBar = document.getElementById("seasonBar");
const h2hView = document.getElementById("h2hView");
const dramaView = document.getElementById("dramaView");
let mode = "h2h";

/* ---- チームメイト対決 ---- */
function renderH2H(rows, season) {
  // team -> [[driver,pts], ...]
  const byTeam = {};
  for (const [team, driver, pts] of rows) (byTeam[team] ??= []).push([driver, Number(pts)]);
  // チームを合計ポイント降順で
  const teams = Object.keys(byTeam).sort((a, b) =>
    byTeam[b].reduce((s, x) => s + x[1], 0) - byTeam[a].reduce((s, x) => s + x[1], 0));

  const host = document.getElementById("h2h");
  host.replaceChildren();
  document.getElementById("h2hTitle").textContent = season + "年 · Teammate Head-to-Head";

  for (const team of teams) {
    const pair = byTeam[team].sort((a, b) => b[1] - a[1]);
    const col = TEAM_COLORS[team] || DEFAULT_TEAM_COLOR;
    const max = Math.max(pair[0][1], 1);

    const box = document.createElement("div");
    box.className = "h2h-team";
    const badge = '<span class="badge" style="background:' + col + ";color:" + textOn(col) + '">' + (TEAM_ABBR[team] || "—") + "</span>";
    let html = '<div class="h2h-head">' + badge + "<strong>" + escapeHtml(team) + "</strong></div>";
    pair.forEach(([drv, pts], i) => {
      const w = Math.round((pts / max) * 100);
      const win = i === 0 && pair.length > 1 && pts > pair[1][1] ? " win" : "";
      html += '<div class="h2h-row">' +
        '<div class="h2h-name' + win + '">' + escapeHtml(drv) + "</div>" +
        '<div class="h2h-bar-wrap"><div class="h2h-bar" style="width:' + w + "%;background:" + col + '"></div></div>' +
        '<div class="h2h-pts">' + pts.toLocaleString() + "</div></div>";
    });
    box.innerHTML = html;
    host.appendChild(box);
  }
}

/* ---- 接戦度・首位交代 ---- */
function renderDrama(rows) {
  // [season, leadChanges, finalMargin, champion, runnerup]
  const data = rows.map((r) => ({
    season: r[0], changes: Number(r[1]), margin: Number(r[2]), champ: r[3], runner: r[4],
  }));
  // 劇的さ順：首位交代が多い → 最終差が小さい
  data.sort((a, b) => (b.changes - a.changes) || (a.margin - b.margin));

  const host = document.getElementById("drama");
  host.replaceChildren();
  data.forEach((d, i) => {
    const card = document.createElement("div");
    card.className = "drama-card" + (i === 0 ? " hot" : "");
    const tags = [];
    if (i === 0) tags.push('<span class="drama-tag">MOST DRAMATIC</span>');
    else if (d.margin <= 10) tags.push('<span class="drama-tag" style="background:#b88500">接戦</span>');
    const col = teamColor(d.champ, d.season);
    card.innerHTML =
      '<div><span class="drama-season">' + escapeHtml(d.season) + "</span>" + tags.join("") + "</div>" +
      '<div class="drama-metric"><span class="lab">首位交代</span><span class="val">' + d.changes + " 回</span></div>" +
      '<div class="drama-metric"><span class="lab">最終ポイント差</span><span class="val">' + d.margin.toLocaleString() + " pts</span></div>" +
      '<div class="drama-champ">🏆 <strong style="color:' + col + '">' + escapeHtml(d.champ) + "</strong>" +
        (d.runner ? ' <span style="color:var(--muted)">vs ' + escapeHtml(d.runner) + "</span>" : "") + "</div>";
    host.appendChild(card);
  });
}

async function load() {
  showStatus("読み込み中…");
  try {
    if (mode === "h2h") {
      const season = seasonSel.value;
      const res = await fetch("api/h2h_api.php?season=" + encodeURIComponent(season));
      if (!res.ok) throw new Error("HTTP " + res.status);
      const rows = parseCsvRows(await res.text());
      if (rows.length === 0) { showStatus("データがありません。", true); return; }
      renderH2H(rows, season);
    } else {
      const res = await fetch("api/drama_api.php");
      if (!res.ok) throw new Error("HTTP " + res.status);
      renderDrama(parseCsvRows(await res.text()));
    }
    clearStatus();
  } catch (err) {
    console.error(err);
    showStatus("データの取得に失敗しました（" + err.message + "）", true);
  }
}

function initSeasons() {
  for (let y = 2026; y >= 2000; y--) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = y + "年" + (y === 2026 ? "（進行中）" : "");
    if (y === 2025) opt.selected = true;
    seasonSel.appendChild(opt);
  }
}

function setMode(m) {
  mode = m;
  [...document.querySelectorAll("#seg button")].forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  const isH2h = mode === "h2h";
  seasonBar.classList.toggle("hidden", !isH2h);
  h2hView.classList.toggle("hidden", !isH2h);
  dramaView.classList.toggle("hidden", isH2h);
}

document.getElementById("seg").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  setMode(btn.dataset.mode);
  load();
});

seasonSel.addEventListener("change", load);
initSeasons();
// URLハッシュで初期表示を指定可能（#h2h / #drama）
const h0 = location.hash.replace("#", "");
if (["h2h", "drama"].includes(h0)) setMode(h0);
load();
