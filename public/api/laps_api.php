<?php
/*
 * laps_api.php ― レース展開（周回ごとの順位）WebAPI
 *
 * 2つのモード:
 *   ?list=1              … 取得済みレースの一覧（選択肢用）
 *                          -> season,round,name,laps
 *   ?season=2025&round=1 … そのレースの周回ごと順位（折れ線用・ロング形式）
 *                          -> driver,lap,position
 *
 * 【安全対策】
 *   season / round は整数バインド(プリペアドステートメント)で扱い、SQLインジェクションを防ぐ。
 *   未指定・数字以外・取得済みでないレース・配列指定は HTTP 400。
 */

require_once __DIR__ . "/db.php";
$db = open_db();

// --- 一覧モード ---
if (param_str("list") !== null) {
    header("Content-Type: text/plain; charset=utf-8");
    echo "season,round,name,laps\n";
    $res = $db->query("SELECT season, round, name, laps FROM raceinfo ORDER BY season DESC, round");
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) {
        csv_row([$r["season"], $r["round"], $r["name"], $r["laps"]]);
    }
    exit;
}

// --- レース展開モード ---
$season = param_int("season", RACE_SEASON_FIRST, SEASON_LAST);
$round = param_int("round", 1, 99);

// 取得済み（raceinfo にある）レースかを確認。無ければ 400
$chk = $db->prepare("SELECT 1 FROM raceinfo WHERE season = :s AND round = :r");
$chk->bindValue(":s", $season, SQLITE3_INTEGER);
$chk->bindValue(":r", $round, SQLITE3_INTEGER);
if ($chk->execute()->fetchArray() === false) {
    bad_request("指定したレースのデータはありません（list=1 で一覧を確認できます）");
}

header("Content-Type: text/plain; charset=utf-8");

$stmt = $db->prepare(
    "SELECT driver, lap, position FROM laptbl WHERE season = :s AND round = :r ORDER BY lap, position"
);
$stmt->bindValue(":s", $season, SQLITE3_INTEGER);
$stmt->bindValue(":r", $round, SQLITE3_INTEGER);
$result = $stmt->execute();

echo "driver,lap,position\n";
while ($res = $result->fetchArray(SQLITE3_ASSOC)) {
    csv_row([$res["driver"], $res["lap"], $res["position"]]);
}
?>
