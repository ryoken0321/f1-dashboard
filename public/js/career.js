"use strict";
/* ドライバー検索 & キャリア比較：
   名前を入力 → career_api.php(LIKE検索) → 該当ドライバーの年別ポイントを折れ線で重ね描き。
   1人なら「検索」、複数追加すれば「世代を超えた比較」になる。 */

const YEARS = [];
for (let y = 2000; y <= 2026; y++) YEARS.push(y);

const PALETTE = ["#ff2d24", "#36c9f0", "#9be564", "#ffce54", "#c792ea", "#ff8fb1", "#ffa600", "#7ee787"];
const nameInput = document.getElementById("nameInput");
const chipsEl = document.getElementById("chips");
const added = new Map(); // driver -> { points: [27], color }
let chart = null;

/** teamdata.js から全ドライバー名を集めて datalist を作る */
function initDriverList() {
  const names = new Set();
  const td = window.TEAM_DATA || {};
  for (const y of Object.keys(td)) for (const drv of Object.keys(td[y])) names.add(drv);
  const dl = document.getElementById("driverList");
  [...names].sort().forEach((n) => {
    const o = document.createElement("option");
    o.value = n;
    dl.appendChild(o);
  });
}

/** ドライバーの最新所属チームの色を返す（無ければパレットから） */
function colorForDriver(driver, fallbackIdx) {
  for (let y = 2026; y >= 2000; y--) {
    if (teamOf(driver, y)) return teamColor(driver, y);
  }
  return PALETTE[fallbackIdx % PALETTE.length];
}

function renderChips() {
  chipsEl.replaceChildren();
  for (const [drv, info] of added) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.style.borderColor = info.color;
    chip.innerHTML = '<span class="chip-dot" style="background:' + escapeHtml(info.color) + '"></span>' +
      escapeHtml(drv) + ' <span class="chip-x" title="削除">✕</span>';
    chip.querySelector(".chip-x").addEventListener("click", () => { added.delete(drv); renderChips(); renderChart(); });
    chipsEl.appendChild(chip);
  }
}

function renderChart() {
  const datasets = [...added.entries()].map(([drv, info]) => ({
    label: drv,
    data: info.points,
    borderColor: info.color,
    backgroundColor: info.color,
    tension: 0.25,
    spanGaps: true,
    pointRadius: 2,        // 高得点者と並べても線が底に潰れて消えないよう点を表示
    pointHoverRadius: 6,
    borderWidth: 2.5,
  }));
  const labels = YEARS.map(String);

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets = datasets;
    chart.update();
    return;
  }
  const ctx = document.getElementById("myChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", align: "start", labels: { usePointStyle: true, pointStyle: "line", padding: 16, font: { weight: "700" } } },
        tooltip: { backgroundColor: "#11141a", borderColor: "#e10600", borderWidth: 1, titleColor: "#fff", bodyColor: "#dfe3ea", padding: 12, usePointStyle: true },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 60, minRotation: 0, font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.06)" }, title: { display: true, text: "獲得ポイント", color: "#8b93a1" } },
      },
    },
  });
}

async function addDriver() {
  const q = nameInput.value.trim();
  if (q === "") return;
  showStatus("検索中…");
  try {
    const res = await fetch("api/career_api.php?name=" + encodeURIComponent(q));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = parseCsvRows(await res.text()); // driver,season,points
    if (rows.length === 0) { showStatus("「" + q + "」に一致するドライバーが見つかりません。", true); return; }

    // driver ごとに 27年分の配列へ整形
    const byDriver = {};
    for (const [drv, season, pts] of rows) {
      (byDriver[drv] ??= {})[Number(season)] = Number(pts);
    }
    let newCount = 0;
    for (const drv of Object.keys(byDriver)) {
      if (added.has(drv)) continue;
      const points = YEARS.map((y) => (byDriver[drv][y] != null ? byDriver[drv][y] : 0));
      added.set(drv, { points, color: colorForDriver(drv, added.size) });
      newCount++;
    }
    nameInput.value = "";
    renderChips(); renderChart();
    if (newCount === 0) showStatus("すでに追加済みです。", true);
    else clearStatus();
  } catch (err) {
    console.error(err);
    showStatus("検索に失敗しました（" + err.message + "）", true);
  }
}

document.getElementById("addBtn").addEventListener("click", addDriver);
document.getElementById("clearBtn").addEventListener("click", () => { added.clear(); renderChips(); renderChart(); clearStatus(); });
nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addDriver(); } });

initDriverList();
renderChart();
// 初期表示として代表的な3人を入れておく（フルネームで各1人に限定）
(async () => {
  for (const n of ["Michael Schumacher", "Lewis Hamilton", "Max Verstappen"]) {
    nameInput.value = n;
    await addDriver();
  }
})();
