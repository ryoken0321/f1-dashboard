"use strict";
/* 画面2：シーズン内ポイント推移（折れ線・上位6名） */

// 折れ線の色（上位6名分・ダーク背景で映える配色）
const COLORS = ["#ff2d24", "#36c9f0", "#9be564", "#ffce54", "#c792ea", "#ff8fb1"];
const TOP_N = 6;

const seasonSel = document.getElementById("seasonSel");
let chart = null;

/**
 * ロング形式の行 [driver, round, points] から折れ線用の { labels, datasets } を作る。
 * 最終ラウンドのポイントで上位 TOP_N 名に絞る。
 */
function buildSeries(rows) {
  const rounds = [...new Set(rows.map((r) => Number(r[1])))].sort((a, b) => a - b);
  const byDriver = {};
  for (const [driver, rnd, pts] of rows) {
    (byDriver[driver] ??= {})[Number(rnd)] = Number(pts);
  }
  const lastRound = rounds[rounds.length - 1];
  const top = Object.keys(byDriver)
    .sort((a, b) => (byDriver[b][lastRound] || 0) - (byDriver[a][lastRound] || 0))
    .slice(0, TOP_N);

  const season = seasonSel.value;
  const teamSeen = {}; // 同一チーム2人目（チームメイト）は破線で区別
  const datasets = top.map((drv, i) => {
    const team = teamOf(drv, season);
    const color = team ? teamColor(drv, season) : COLORS[i % COLORS.length];
    const isMate = team && teamSeen[team];
    if (team) teamSeen[team] = true;
    return {
      label: drv + (team ? "（" + team + "）" : ""),
      data: rounds.map((rd) => (drv in byDriver && byDriver[drv][rd] != null ? byDriver[drv][rd] : null)),
      borderColor: color,
      backgroundColor: color,
      borderDash: isMate ? [7, 4] : [],
      tension: 0.25,
      spanGaps: true,
      pointRadius: 0,
      pointHoverRadius: 5,
      borderWidth: 2.5,
    };
  });

  return { labels: rounds.map((r) => "第" + r + "戦"), datasets };
}

function renderChart({ labels, datasets }) {
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
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top", align: "start",
          labels: { usePointStyle: true, pointStyle: "line", padding: 16, font: { weight: "700" } },
        },
        tooltip: {
          backgroundColor: "#11141a", borderColor: "#e10600", borderWidth: 1,
          titleColor: "#fff", bodyColor: "#dfe3ea", padding: 12, usePointStyle: true,
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 60, minRotation: 0, font: { size: 10 } } },
        y: {
          beginAtZero: true, grid: { color: "rgba(255,255,255,0.06)" },
          title: { display: true, text: "累積ポイント", color: "#8b93a1" },
        },
      },
    },
  });
}

async function loadData() {
  const season = seasonSel.value;
  const endpoint = "api/trend_api.php?season=" + encodeURIComponent(season);
  document.getElementById("chartTitle").textContent =
    seasonSel.options[seasonSel.selectedIndex].textContent + " · Cumulative Points by Round";

  showStatus("読み込み中…");
  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const rows = parseCsvRows(text);
    if (rows.length === 0) {
      showStatus("データがありません。", true);
      return;
    }
    renderChart(buildSeries(rows));
    clearStatus();
  } catch (err) {
    console.error(err);
    showStatus(`データの取得に失敗しました（${err.message}）`, true);
  }
}

/** シーズン選択肢を 2026→2021 の降順で生成。既定は最新の完走年(2025)。 */
function initSeasons() {
  for (let y = 2026; y >= 2021; y--) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = y + "年" + (y === 2026 ? "（進行中）" : "");
    if (y === 2025) opt.selected = true;
    seasonSel.appendChild(opt);
  }
}

initSeasons();
seasonSel.addEventListener("change", loadData);
document.getElementById("reloadBtn").addEventListener("click", loadData);
loadData();
