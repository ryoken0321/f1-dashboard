"use strict";
/* 画面1：年別ドライバーランキング（棒グラフ + 順位表 + 王者スタッツ） */

const VALUE_COLUMN = 1;
const fieldSelect = document.getElementById("fieldName");
const teamFilter = document.getElementById("teamFilter");
const sortSel = document.getElementById("sortSel");
let chart = null;
let currentFull = []; // 全出走者 [driver, points]（絞り込み/並べ替えの元データ）

/** 選択中のセレクター表示テキスト（例: "2025年"）を返す */
function selectedLabel() {
  return fieldSelect.options[fieldSelect.selectedIndex].textContent;
}

/** 選択中のシーズン（例: "2025"）を返す。value は "y2025" 形式 */
function currentSeason() {
  return fieldSelect.value.replace(/^y/, "");
}

/**
 * API が返すのはポイント獲得者(>0)のみ。teamdata.js の出走者リストを使い、
 * 「その年に出走したが0点だったドライバー」を 0点として末尾に補う。
 * （出走していない＝他の年のドライバーは TEAM_DATA に無いので混入しない）
 */
function withParticipants(rows, season) {
  const present = new Set(rows.map((r) => r[0]));
  const yearMap = window.TEAM_DATA && window.TEAM_DATA[String(season)];
  if (!yearMap) return rows;
  const extra = Object.keys(yearMap)
    .filter((drv) => !present.has(drv))
    .sort((a, b) => a.localeCompare(b))
    .map((drv) => [drv, "0"]);
  return rows.concat(extra); // rows は降順済み、0点勢は末尾
}

/** 王者・最高得点・人数のサマリーを更新 */
function renderStats(rows) {
  if (rows.length === 0) {
    document.getElementById("statChamp").textContent = "—";
    document.getElementById("statPoints").innerHTML = '—<span class="u">pts</span>';
    document.getElementById("statDrivers").innerHTML = '—<span class="u">人</span>';
    return;
  }
  const season = currentSeason();
  const champ = rows[0];
  const champEl = document.getElementById("statChamp");
  champEl.textContent = "🥇 " + champ[0];
  // 王者カードの左バーをチームカラーに
  const card = champEl.closest(".stat");
  if (card) card.style.setProperty("--bar", teamColor(champ[0], season));
  document.getElementById("statPoints").innerHTML =
    Number(champ[VALUE_COLUMN]).toLocaleString() + '<span class="u">pts</span>';
  // 得点者数 / 出走者数（出走者は teamdata.js から）
  const yearMap = window.TEAM_DATA && window.TEAM_DATA[String(season)];
  const entered = yearMap ? Object.keys(yearMap).length : rows.length;
  document.getElementById("statDrivers").innerHTML =
    rows.length + '<span class="u">/ ' + entered + " 人</span>";
}

const MEDALS = ["🥇", "🥈", "🥉"];

/** 順位表を描画。podium=true のとき上位3名を表彰台カラーにする */
function renderTable(rows, podium = true) {
  const table = document.getElementById("dataTable");
  table.replaceChildren();

  const season = currentSeason();

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const cols = ["#", "ドライバー", "チーム", selectedLabel() + " ポイント"];
  for (const label of cols) {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row, i) => {
    const tr = document.createElement("tr");
    if (podium && i < 3) tr.className = "p" + (i + 1);
    if (Number(row[VALUE_COLUMN]) === 0) tr.classList.add("zero");

    const tdPos = document.createElement("td");
    tdPos.className = "pos";
    tdPos.textContent = (i + 1);
    tr.appendChild(tdPos);

    const tdName = document.createElement("td");
    tdName.className = "name";
    tdName.innerHTML = (podium && i < 3 ? '<span class="medal">' + MEDALS[i] + "</span>" : "") + escapeHtml(row[0]);
    tr.appendChild(tdName);

    // チーム列：チームカラーのバッジ(略称) + チーム名
    const tdTeam = document.createElement("td");
    tdTeam.className = "team";
    const team = teamOf(row[0], season);
    const col = teamColor(row[0], season);
    const badge = '<span class="badge" style="background:' + col + ";color:" + textOn(col) +
      '">' + escapeHtml(teamAbbr(row[0], season)) + "</span>";
    tdTeam.innerHTML = badge + '<span class="team-name">' + escapeHtml(team || "—") + "</span>";
    tr.appendChild(tdTeam);

    const tdPts = document.createElement("td");
    tdPts.className = "num";
    tdPts.textContent = Number(row[VALUE_COLUMN]).toLocaleString();
    tr.appendChild(tdPts);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

/** パース済みデータから棒グラフを描画（既存があれば更新）。上位15名に絞る */
function renderChart(rows, valueLabel) {
  const view = rows.slice(0, 15);
  const season = currentSeason();
  const labels = view.map((r) => r[0]);
  const data = view.map((r) => Number(r[VALUE_COLUMN]) || 0);
  // 各バーをその年のチームカラーで塗る
  const colors = view.map((r) => teamColor(r[0], season));

  const ctx = document.getElementById("myChart").getContext("2d");

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].label = valueLabel;
    chart.data.datasets[0].backgroundColor = colors;
    chart.update();
    return;
  }

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: valueLabel,
        data,
        backgroundColor: colors,
        borderWidth: 0,
        borderRadius: 5,
        maxBarThickness: 30,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#11141a",
          borderColor: "#e10600",
          borderWidth: 1,
          titleColor: "#fff",
          bodyColor: "#dfe3ea",
          padding: 12,
          callbacks: {
            label: (c) => " " + c.parsed.y.toLocaleString() + " pts",
            afterLabel: (c) => {
              const t = teamOf(c.label, currentSeason());
              return t ? " " + t : "";
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 60, minRotation: 45, font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.06)" } },
      },
    },
  });
}

/** API から CSV を取得してグラフ・表・スタッツに表示 */
async function loadData() {
  const year = fieldSelect.value; // 例: "y2025"
  const endpoint = "api/api.php?fieldname=" + encodeURIComponent(year);
  document.getElementById("chartTitle").textContent = selectedLabel() + " · Points by Driver";

  showStatus("読み込み中…");
  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    if (text.trim().length === 0) {
      showStatus("データがありません。", true);
      renderTable([], false); renderChart([], "ポイント"); renderStats([]);
      return;
    }

    const { rows } = parseCsv(text);
    renderStats(rows);                                  // 王者・得点者数（>0）
    currentFull = withParticipants(rows, currentSeason()); // 全出走者を保持
    populateTeamFilter(currentFull, currentSeason());
    applyView();                                        // 絞り込み/並べ替えして描画
    clearStatus();
  } catch (err) {
    console.error(err);
    showStatus(`データの取得に失敗しました（${err.message}）`, true);
  }
}

/** その年に存在するチームで絞り込みドロップダウンを更新（選択は可能なら維持） */
function populateTeamFilter(rows, season) {
  const prev = teamFilter.value;
  const teams = [...new Set(rows.map((r) => teamOf(r[0], season)).filter(Boolean))].sort();
  teamFilter.replaceChildren();
  const all = document.createElement("option");
  all.value = "all"; all.textContent = "全チーム";
  teamFilter.appendChild(all);
  for (const t of teams) {
    const o = document.createElement("option");
    o.value = t; o.textContent = t;
    teamFilter.appendChild(o);
  }
  teamFilter.value = teams.includes(prev) ? prev : "all";
}

/** 絞り込み + 並べ替え済みの配列を返す */
function viewList() {
  const season = currentSeason();
  let list = currentFull.slice();
  if (teamFilter.value !== "all") {
    list = list.filter((r) => teamOf(r[0], season) === teamFilter.value);
  }
  const sort = sortSel.value;
  if (sort === "name") {
    list.sort((a, b) => a[0].localeCompare(b[0]));
  } else if (sort === "team") {
    list.sort((a, b) =>
      (teamOf(a[0], season) || "").localeCompare(teamOf(b[0], season) || "") ||
      Number(b[1]) - Number(a[1]));
  } else {
    list.sort((a, b) => Number(b[1]) - Number(a[1]));
  }
  return list;
}

/** 現在の絞り込み/並べ替えで表とグラフを再描画 */
function applyView() {
  const list = viewList();
  const podium = sortSel.value === "points" && teamFilter.value === "all";
  renderTable(list, podium);
  // 棒グラフは常にポイント降順の上位を表示
  const byPoints = list.slice().sort((a, b) => Number(b[1]) - Number(a[1]));
  renderChart(byPoints, selectedLabel() + " ポイント");
}

/** 表示中のデータ（絞り込み/並べ替え後）をCSVでダウンロード */
function downloadCsv() {
  const season = currentSeason();
  const list = viewList();
  const head = "rank,driver,team,points";
  const lines = list.map((r, i) => toCsvLine([i + 1, r[0], teamOf(r[0], season) || "", r[1]]));
  const csv = head + "\n" + lines.join("\n") + "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const tag = teamFilter.value !== "all" ? "_" + teamFilter.value.replace(/\s+/g, "") : "";
  a.href = url;
  a.download = "f1_" + season + tag + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** シーズン(年)の選択肢を 2026→2000 の降順で生成。既定は最新の完走年(2025)。 */
function initYears() {
  for (let y = 2026; y >= 2000; y--) {
    const opt = document.createElement("option");
    opt.value = "y" + y;
    opt.textContent = y + "年" + (y === 2026 ? "（進行中）" : "");
    if (y === 2025) opt.selected = true;
    fieldSelect.appendChild(opt);
  }
}

initYears();
fieldSelect.addEventListener("change", loadData);
teamFilter.addEventListener("change", applyView);
sortSel.addEventListener("change", applyView);
document.getElementById("reloadBtn").addEventListener("click", loadData);
document.getElementById("dlBtn").addEventListener("click", downloadCsv);
loadData();
