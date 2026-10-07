<?php
/*
 * gap_api.php ― 予選→決勝「追い上げ／後退」WebAPI
 *
 * season(年)を受け取り、そのシーズンの各ドライバーについて
 *   races    : 集計対象レース数（grid>0 のレースのみ）
 *   avg_grid : 平均スタート位置
 *   avg_fin  : 平均決勝順位
 *   net      : 通算の獲得ポジション = Σ(grid - finish)  ＋なら追い上げ／−なら後退
 * を CSV で返す（net 降順）。
 *
 *   例) gap_api.php?season=2025
 *       -> driver,races,avg_grid,avg_fin,net
 *          Esteban Ocon,24,15.0,12.5,60
 *          ...
 *
 * grid=0（ピットレーンスタート）は基準があいまいなので集計から除外する。
 *
 * 【安全対策】
 *   season は範囲チェック + 整数バインド(プリペアドステートメント)で扱い、
 *   SQLインジェクションを防ぐ。未指定・範囲外・配列指定は HTTP 400。
 */

require_once __DIR__ . "/db.php";

$season = param_int("season", RACE_SEASON_FIRST, SEASON_LAST);

header("Content-Type: text/plain; charset=utf-8");

$db = open_db();
$stmt = $db->prepare(
    "SELECT driver,
            COUNT(*) AS races,
            ROUND(AVG(grid), 1) AS avg_grid,
            ROUND(AVG(finish), 1) AS avg_fin,
            SUM(grid - finish) AS net
     FROM gridtbl
     WHERE season = :s AND grid > 0
     GROUP BY driver
     ORDER BY net DESC, driver"
);
$stmt->bindValue(":s", $season, SQLITE3_INTEGER);
$result = $stmt->execute();

echo "driver,races,avg_grid,avg_fin,net\n";
while ($res = $result->fetchArray(SQLITE3_ASSOC)) {
    csv_row([$res["driver"], $res["races"], $res["avg_grid"], $res["avg_fin"], $res["net"]]);
}
?>
