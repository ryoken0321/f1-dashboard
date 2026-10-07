"use strict";
/* 歴代画面：ドライバー通算 / チーム通算 / 王者の年表 を切替表示。 */

const rankView = document.getElementById("rankView");
const champView = document.getElementById("champView");
let chart = null;
let mode = "driver";

/** ドライバーの最新所属チームの色（無ければ赤） */
function driverColor(driver) {
  for (let y = 2026; y >= 2000; y--) if (teamOf(driver, y)) return teamColor(driver, y);
  return "#ff2d24";
}
function driverLatestTeam(driver) {
  for (let y = 2026; y >= 2000; y--) if (teamOf(driver, y)) return teamOf(driver, y);
  return "";
}

const MEDALS = ["🥇", "🥈", "🥉"];

function renderRank(rows) {
  const isTeam = mode === "team";
  // 色
  const colorOf = (name) => isTeam ? (TEAM_COLORS[name] || DEFAULT_TEAM_COLOR) : driverColor(name);

  // グラフ（上位15）
  const view = rows.slice(0, 15);
  const labels = view.map((r) => r[0]);
  const data = view.map((r) => Number(r[1]) || 0);
  const colors = view.map((r) => colorOf(r[0]));
  document.getElementById("chartTitle").textContent =
    (isTeam ? "チーム通算ポイント" : "ドライバー通算ポイント") + "（上位15）";

  const ctx = document.getElementById("myChart").getContext("2d");
  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = colors;
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, borderRadius: 5, maxBarThickness: 30 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "#11141a", borderColor: "#e10600", borderWidth: 1, titleColor: "#fff", bodyColor: "#dfe3ea", padding: 12,
            callbacks: { label: (c) => " " + c.parsed.y.toLocaleString() + " pts" } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 60, minRotation: 45, font: { size: 10 } } },
          y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.06)" } },
        },
      },
    });
  }

  // 表（全件）
  const table = document.getElementById("dataTable");
  table.replaceChildren();
  const thead = document.createElement("thead");
  thead.innerHTML = isTeam
    ? "<tr><th>#</th><th>チーム</th><th class='num'>通算ポイント</th></tr>"
    : "<tr><th>#</th><th>ドライバー</th><th>最新所属</th><th class='num'>通算ポイント</th></tr>";
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    if (i < 3) tr.className = "p" + (i + 1);
    const col = colorOf(r[0]);
    if (isTeam) {
      const badge = '<span class="badge" style="background:' + col + ";color:" + textOn(col) + '">' + (TEAM_ABBR[r[0]] || "—") + "</span>";
      tr.innerHTML = "<td class='pos'>" + (i + 1) + "</td>" +
        "<td class='team'>" + (i < 3 ? "<span class='medal'>" + MEDALS[i] + "</span>" : "") + badge + "<span class='team-name'>" + escapeHtml(r[0]) + "</span></td>" +
        "<td class='num'>" + Number(r[1]).toLocaleString() + "</td>";
    } else {
      const team = driverLatestTeam(r[0]);
      const badge = '<span class="badge" style="background:' + col + ";color:" + textOn(col) + '">' + (TEAM_ABBR[team] || "—") + "</span>";
      tr.innerHTML = "<td class='pos'>" + (i + 1) + "</td>" +
        "<td class='name'>" + (i < 3 ? "<span class='medal'>" + MEDALS[i] + "</span>" : "") + escapeHtml(r[0]) + "</td>" +
        "<td class='team'>" + badge + "<span class='team-name'>" + escapeHtml(team || "—") + "</span></td>" +
        "<td class='num'>" + Number(r[1]).toLocaleString() + "</td>";
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function renderChampions(rows) {
  const tl = document.getElementById("timeline");
  tl.replaceChildren();
  // 新しい年を上に
  rows.slice().reverse().forEach((r) => {
    const [season, driver, team, points] = r;
    const col = TEAM_COLORS[team] || driverColor(driver);
    const row = document.createElement("div");
    row.className = "tl-row";
    row.style.setProperty("--bar", col);
    const ongoing = season === "2026" ? '<span class="ongoing">（進行中・暫定首位）</span>' : "";
    const badge = '<span class="badge" style="background:' + col + ";color:" + textOn(col) + '">' + (TEAM_ABBR[team] || "—") + "</span>";
    row.innerHTML =
      '<div class="tl-year">' + escapeHtml(season) + "</div>" +
      '<div class="tl-driver">🏆 ' + escapeHtml(driver) + ongoing + "<br>" +
        '<span style="font-size:.82rem;color:var(--muted)">' + badge + escapeHtml(team || "") + "</span></div>" +
      '<div class="tl-pts">' + Number(points).toLocaleString() + " pts</div>";
    tl.appendChild(row);
  });
}

async function load() {
  showStatus("読み込み中…");
  try {
    if (mode === "champions") {
      const res = await fetch("api/champions_api.php");
      if (!res.ok) throw new Error("HTTP " + res.status);
      renderChampions(parseCsvRows(await res.text()));
    } else {
      const res = await fetch("api/alltime_api.php?mode=" + mode);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const rows = parseCsvRows(await res.text());
      if (rows.length === 0) { showStatus("データがありません。", true); return; }
      renderRank(rows);
    }
    clearStatus();
  } catch (err) {
    console.error(err);
    showStatus("データの取得に失敗しました（" + err.message + "）", true);
  }
}

function setMode(m) {
  mode = m;
  [...document.querySelectorAll("#seg button")].forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  const champs = mode === "champions";
  champView.classList.toggle("hidden", !champs);
  rankView.classList.toggle("hidden", champs);
}

document.getElementById("seg").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  setMode(btn.dataset.mode);
  load();
});

// URLハッシュで初期表示を指定可能（#driver / #team / #champions）
const h0 = location.hash.replace("#", "");
if (["driver", "team", "champions"].includes(h0)) setMode(h0);
load();
