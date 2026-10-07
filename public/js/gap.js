"use strict";
/* 画面：予選→決勝の「追い上げ・後退」
   各ドライバーの通算 net = Σ(スタート位置 − 決勝順位) を横棒で表示。
   ＋（追い上げ）は緑、−（後退）は赤。並びは net 降順。 */

const GAIN = "#2ec36e"; // 追い上げ（緑）
const LOSS = "#ff2d24"; // 後退（赤）

const seasonSel = document.getElementById("seasonSel");
let chart = null;

/** ロング形式の行 [driver,races,avg_grid,avg_fin,net] から横棒用データを作る。 */
function buildSeries(rows) {
  // API は net 降順で返すが、横棒は上から大きい順に見せたいのでそのまま使う
  const data = rows.map((r) => ({
    driver: r[0],
    races: Number(r[1]),
    avgGrid: Number(r[2]),
    avgFin: Number(r[3]),
    net: Number(r[4]),
  }));

  return {
    labels: data.map((d) => d.driver),
    datasets: [
      {
        label: "獲得ポジション",
        data: data.map((d) => d.net),
        backgroundColor: data.map((d) => (d.net >= 0 ? GAIN : LOSS)),
        borderColor: data.map((d) => (d.net >= 0 ? GAIN : LOSS)),
        borderWidth: 1,
        borderRadius: 3,
        // tooltip で平均グリッド/順位を出すため元データを保持
        meta: data,
      },
    ],
  };
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
    type: "bar",
    data: { labels, datasets },
    options: {
      indexAxis: "y", // 横棒
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#11141a", borderColor: "#e10600", borderWidth: 1,
          titleColor: "#fff", bodyColor: "#dfe3ea", padding: 12,
          callbacks: {
            label: (item) => {
              const d = item.dataset.meta[item.dataIndex];
              const sign = d.net > 0 ? "+" : "";
              return [
                `通算 ${sign}${d.net} ポジション`,
                `平均: 予選 P${d.avgGrid} → 決勝 P${d.avgFin}`,
                `対象 ${d.races} レース`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.06)" },
          title: { display: true, text: "← 後退　　通算 獲得ポジション　　追い上げ →", color: "#8b93a1" },
        },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  });
}

async function loadData() {
  const season = seasonSel.value;
  const endpoint = "api/gap_api.php?season=" + encodeURIComponent(season);
  document.getElementById("chartTitle").textContent =
    seasonSel.options[seasonSel.selectedIndex].textContent + " · Net Positions Gained";

  showStatus("読み込み中…");
  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = parseCsvRows(await res.text());
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
