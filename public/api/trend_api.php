<?php
/*
 * trend_api.php ― シーズン内ポイント推移 WebAPI
 *
 * season(年)を受け取り、そのシーズンの「各ラウンド終了時点の
 * ドライバー別累積ポイント」を CSV 形式で返す（折れ線グラフ用）。
 *
 *   例) trend_api.php?season=2025
 *       -> driver,round,points
 *          Lando Norris,1,25
 *          Lando Norris,2,44
 *          ...
 *
 * 【安全対策】
 *   season は範囲チェック + 整数バインド(プリペアドステートメント)で扱い、
 *   SQLインジェクションを防ぐ。未指定・範囲外・配列指定は HTTP 400。
 */

require_once __DIR__ . "/db.php";

// 推移データを持っているシーズン（2021〜2026）のみ受け付ける
$season = param_int("season", RACE_SEASON_FIRST, SEASON_LAST);

header("Content-Type: text/plain; charset=utf-8");

$db = open_db();
$stmt = $db->prepare(
    "SELECT driver, round, points FROM racetbl WHERE season = :s ORDER BY round, driver"
);
$stmt->bindValue(":s", $season, SQLITE3_INTEGER);
$result = $stmt->execute();

echo "driver,round,points\n";
while ($res = $result->fetchArray(SQLITE3_ASSOC)) {
    csv_row([$res["driver"], $res["round"], $res["points"]]);
}
?>
