<?php
/*
 * alltime_api.php ― 歴代通算ポイント WebAPI
 *
 * mode=driver : ドライバー別の通算ポイント（2000-2026の合計）
 * mode=team   : チーム別の通算ポイント（所属年ごとに合算）
 * 縦持ちテーブル pointstbl(season,driver,points) を集計する。
 *
 * 【安全対策】mode は driver / team の2値のみ受け付ける（ユーザー入力をSQLに連結しない）。
 *   未指定は driver、それ以外の値は HTTP 400。
 */

require_once __DIR__ . "/db.php";
$mode = param_str("mode") ?? "driver";
if (!in_array($mode, ["driver", "team"], true)) {
    bad_request("mode は driver か team で指定してください");
}

header("Content-Type: text/plain; charset=utf-8");
$db = open_db();

if ($mode === "team") {
    // チーム通算：pointstbl と teamtbl を (season,driver) で JOIN して SUM
    $sql = "SELECT te.team AS name, SUM(p.points) AS total
              FROM pointstbl p
              JOIN teamtbl te ON p.season = te.season AND p.driver = te.driver
             GROUP BY te.team
            HAVING total > 0
             ORDER BY total DESC, name";
} else {
    // ドライバー通算：driver で GROUP BY して SUM
    $sql = "SELECT driver AS name, SUM(points) AS total
              FROM pointstbl
             GROUP BY driver
            HAVING total > 0
             ORDER BY total DESC, name";
}

$result = $db->query($sql);
echo "name,total\n";
while ($r = $result->fetchArray(SQLITE3_ASSOC)) {
    csv_row([$r["name"], $r["total"]]);
}
?>
