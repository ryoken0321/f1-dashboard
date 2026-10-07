"use strict";
/* 画面：レース展開（順位変動）
   1レースを選び、周回ごとの走行順位を折れ線で表示。Y軸を反転して1位を上に。
   各ドライバーはチームカラー、チームメイトは破線で区別。 */

// チームカラーが取れない場合のフォールバック配色
const PALETTE = ["#ff2d24", "#36c9f0", "#9be564", "#ffce54", "#c792ea", "#ff8fb1", "#ffa600", "#7ee787"];

const raceSel = document.getElementById("raceSel");
let chart = null;
let races = []; // [{season, round, name, laps}]

/** ロング形式 [driver,lap,position] を折れ線用に整形。season は色付けの年に使う。 */
function buildSeries(rows, season) {
  const laps = [...new Set(rows.map((r) => Number(r[1])))].sort((a, b) => a - b);
  const byDriver = {};
  for (const [driver, lap, pos] of rows) {
    (byDriver[driver] ??= {})[Number(lap)] = Number(pos);
  }
  // 最終ラップの順位でソート（凡例を上位から並べる）
  const lastLap = laps[laps.length - 1];
  const drivers = Object.keys(byDriver).sort(
    (a, b) => (byDriver[a][lastLap] || 99) - (byDriver[b][lastLap] || 99)
  );

  const teamSeen = {};
  const datasets = drivers.map((drv, i) => {
    const team = teamOf(drv, season);
    const color = team ? teamColor(drv, season) : PALETTE[i % PALETTE.length];
    const isMate = team && teamSeen[team];
    if (team) teamSeen[team] = true;
    return {
      label: drv,
      data: laps.map((lp) => (byDriver[drv][lp] != null ? byDriver[drv][lp] : null)),
      borderColor: color,
      backgroundColor: color,
      borderDash: isMate ? [6, 4] : [],
      tension: 0.2,
      spanGaps: true,
      pointRadius: 0,
      pointHoverRadius: 5,
      borderWidth: 2,
    };
  });

  return { labels: laps.map((l) => l), datasets, maxPos: drivers.length };
}

function renderChart({ labels, datasets, maxPos }) {
  const data = { labels, datasets };
  if (chart) {
    chart.data = data;
    chart.options.scales.y.max = maxPos;
    chart.update();
    return;
  }
  const ctx = document.getElementById("myChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data,
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "nearest", axis: "x", intersect: false },
      plugins: {
        legend: { position: "right", labels: { usePointStyle: true, pointStyle: "line", boxWidth: 24, padding: 8, font: { size: 10 } } },
        tooltip: {
          backgroundColor: "#11141a", borderColor: "#e10600", borderWidth: 1,
          titleColor: "#fff", bodyColor: "#dfe3ea", padding: 12, usePointStyle: true,
          callbacks: {
            title: (items) => "第" + items[0].label + "周",
            label: (item) => `P${item.parsed.y}  ${item.dataset.label}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: "周回 (Lap)", color: "#8b93a1" },
          ticks: { font: { size: 10 }, maxTicksLimit: 20 },
        },
        y: {
          reverse: true, // 1位を上に
          min: 1, max: maxPos,
          grid: { color: "rgba(255,255,255,0.06)" },
          title: { display: true, text: "順位 (上=1位)", color: "#8b93a1" },
          ticks: { stepSize: 1, precision: 0 },
        },
      },
    },
  });
}

async function loadRace() {
  const [season, round] = raceSel.value.split("-").map(Number);
  const info = races.find((r) => r.season === season && r.round === round);
  document.getElementById("chartTitle").textContent =
    (info ? info.name : `${season} 第${round}戦`) + " · Lap-by-Lap Positions";

  showStatus("読み込み中…");
  try {
    const res = await fetch(`api/laps_api.php?season=${season}&round=${round}`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = parseCsvRows(await res.text());
    if (rows.length === 0) { showStatus("このレースのデータがありません。", true); return; }
    renderChart(buildSeries(rows, season));
    clearStatus();
  } catch (err) {
    console.error(err);
    showStatus(`データの取得に失敗しました（${err.message}）`, true);
  }
}

/** 選択肢（取得済みレース一覧）を生成して最初のレースを表示。 */
async function initRaces() {
  showStatus("レース一覧を取得中…");
  try {
    const res = await fetch("api/laps_api.php?list=1");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = parseCsvRows(await res.text());
    races = rows.map((r) => ({ season: Number(r[0]), round: Number(r[1]), name: r[2], laps: Number(r[3]) }));
    if (races.length === 0) { showStatus("表示できるレースがありません。", true); return; }
    for (const r of races) {
      const opt = document.createElement("option");
      opt.value = `${r.season}-${r.round}`;
      opt.textContent = `${r.season} 第${r.round}戦  ${r.name}`;
      raceSel.appendChild(opt);
    }
    clearStatus();
    await loadRace();
  } catch (err) {
    console.error(err);
    showStatus(`レース一覧の取得に失敗しました（${err.message}）`, true);
  }
}

raceSel.addEventListener("change", loadRace);
document.getElementById("reloadBtn").addEventListener("click", loadRace);
initRaces();
