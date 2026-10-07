<?php
/*
 * champions_api.php ― 王者の系譜（各年チャンピオン）WebAPI
 *
 * 各シーズンで最多ポイントだったドライバー（=その年の王者）と所属チームを返す。
 * pointstbl から「年ごとの最大ポイント」を求める副問い合わせを JOIN して特定する。
 *   ※ 2026年は進行中のため「現在の首位」を暫定表示。
 *
 * 出力: season,driver,team,points
 */

header("Content-Type: text/plain; charset=utf-8");
require_once __DIR__ . "/db.php";
$db = open_db();

$sql = "SELECT p.season AS season, p.driver AS driver, p.points AS points, te.team AS team
          FROM pointstbl p
          JOIN (SELECT season, MAX(points) AS mx FROM pointstbl GROUP BY season) m
            ON p.season = m.season AND p.points = m.mx
          LEFT JOIN teamtbl te ON te.season = p.season AND te.driver = p.driver
         WHERE p.points > 0
         ORDER BY p.season, p.driver";

$result = $db->query($sql);
echo "season,driver,team,points\n";
while ($r = $result->fetchArray(SQLITE3_ASSOC)) {
    csv_row([$r["season"], $r["driver"], $r["team"], $r["points"]]);
}
?>
