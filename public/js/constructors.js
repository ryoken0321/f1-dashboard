"use strict";
/* コンストラクターズ(チーム)ランキング：constructor_api.php を呼び、
   チーム別合計ポイントを棒グラフ + 表で表示。バーはチームカラー。 */

const seasonSel = document.getElementById("seasonSel");
let chart = null;

function abbrOf(team) { return TEAM_ABBR[team] || "—"; }
function colorOf(team) { return TEAM_COLORS[team] || DEFAULT_TEAM_COLOR; }

function renderStats(rows) {
  const champ = rows[0];
  const scored = rows.filter((r) => Number(r[1]) > 0).length;
  document.getElementById("statChamp").textContent = champ ? "🏆 " + champ[0] : "—";
  document.getElementById("statPoints").innerHTML =
    (champ ? Number(champ[1]).toLocaleString() : "—") + '<span class="u">pts</span>';
  // 得点チーム数 / 出走チーム数
  document.getElementById("statTeams").innerHTML =
    scored + '<span class="u">/ ' + rows.length + " チーム</span>";
  const card = document.getElementById("statChamp").closest(".stat");
  if (card && champ) card.style.setProperty("--bar", colorOf(champ[0]));
}

const MEDALS = ["🥇", "🥈", "🥉"];
function renderTable(rows) {
  const table = document.getElementById("dataTable");
  table.replaceChildren();
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>#</th><th>チーム</th><th class='num'>合計ポイント</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    if (i < 3) tr.className = "p" + (i + 1);
    if (Number(r[1]) === 0) tr.classList.add("zero");
    const col = colorOf(r[0]);
    const badge = '<span class="badge" style="background:' + col + ";color:" + textOn(col) +
      '">' + abbrOf(r[0]) + "</span>";
    tr.innerHTML =
      "<td class='pos'>" + (i + 1) + "</td>" +
      "<td class='team'>" + (i < 3 ? "<span class='medal'>" + MEDALS[i] + "</span>" : "") +
        badge + "<span class='team-name'>" + escapeHtml(r[0]) + "</span></td>" +
      "<td class='num'>" + Number(r[1]).toLocaleString() + "</td>";
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function renderChart(rows) {
  // 棒グラフは得点したチームのみ（0点の空バーは出さない）
  const view = rows.filter((r) => Number(r[1]) > 0);
  const labels = view.map((r) => r[0]);
  const data = view.map((r) => Number(r[1]) || 0);
  const colors = view.map((r) => colorOf(r[0]));
  const ctx = document.getElementById("myChart").getContext("2d");

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.update();
    return;
  }
  chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, borderRadius: 5, maxBarThickness: 34 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#11141a", borderColor: "#e10600", borderWidth: 1,
          titleColor: "#fff", bodyColor: "#dfe3ea", padding: 12,
          callbacks: { label: (c) => " " + c.parsed.y.toLocaleString() + " pts" },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 50, minRotation: 30, font: { size: 11 } } },
        y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.06)" } },
      },
    },
  });
}

async function loadData() {
  const season = seasonSel.value;
  document.getElementById("chartTitle").textContent = season + "年 · Points by Team";
  showStatus("読み込み中…");
  try {
    const res = await fetch("api/constructor_api.php?season=" + encodeURIComponent(season));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = parseCsvRows(await res.text());
    if (rows.length === 0) { showStatus("データがありません。", true); return; }
    renderStats(rows); renderTable(rows); renderChart(rows);
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

initSeasons();
seasonSel.addEventListener("change", loadData);
document.getElementById("reloadBtn").addEventListener("click", loadData);
loadData();
