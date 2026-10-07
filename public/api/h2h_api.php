<?php
/*
 * h2h_api.php ― チームメイト対決（Head-to-Head）WebAPI
 *
 * 指定年(season)について、各チームの上位2人（=チームメイト）の
 * ポイントを返す。ウィンドウ関数 ROW_NUMBER() でチームごとに上位2名を抽出。
 *
 * 【安全対策】season は範囲チェック + 整数バインド。未指定・範囲外・配列指定は HTTP 400。
 * ※ ウィンドウ関数は SQLite 3.25+ が必要（EC2の sqlite3 は対応）。
 *
 * 出力: team,driver,points （チームごとにポイント降順）
 */

require_once __DIR__ . "/db.php";
$season = param_int("season", SEASON_FIRST, SEASON_LAST);

header("Content-Type: text/plain; charset=utf-8");
$db = open_db();

$stmt = $db->prepare(
    "SELECT team, driver, pts FROM (
        SELECT te.team AS team, p.driver AS driver, p.points AS pts,
               ROW_NUMBER() OVER (PARTITION BY te.team ORDER BY p.points DESC, p.driver) AS rn
          FROM pointstbl p
          JOIN teamtbl te ON p.season = te.season AND p.driver = te.driver
         WHERE p.season = :s
     ) WHERE rn <= 2
     ORDER BY team, pts DESC, driver"
);
$stmt->bindValue(":s", $season, SQLITE3_INTEGER);
$result = $stmt->execute();

echo "team,driver,points\n";
while ($r = $result->fetchArray(SQLITE3_ASSOC)) {
    csv_row([$r["team"], $r["driver"], $r["pts"]]);
}
?>
