<?php
/*
 * career_api.php ― ドライバー検索 & キャリア推移 WebAPI
 *
 * 検索ボックスに入力された名前(部分一致)で f1tbl を LIKE 検索し、
 * 該当ドライバーの 2000〜2026 年の年別ポイントを CSV(縦持ち)で返す。
 * 画面2の「ドライバー検索」「ドライバー比較」で共用する。
 *
 *   例) career_api.php?name=Schumacher
 *       -> driver,season,points
 *          Michael Schumacher,2000,108
 *          Michael Schumacher,2001,123
 *          ...
 *          Ralf Schumacher,2000,24
 *          ...
 *
 * 【安全対策】
 *   自由入力(名前)はSQLインジェクションの典型的な入口。
 *   文字列を直接連結せず、プリペアドステートメントの LIKE バインドで安全に扱う。
 *   LIKE のワイルドカード（% _）と エスケープ文字(\) は入力中ではただの文字として扱う。
 *   （列名 y2000〜y2026 は固定配列から生成するのでユーザー入力を含まない）
 */

require_once __DIR__ . "/db.php";

$years = range(SEASON_FIRST, SEASON_LAST);
$name = param_str("name") ?? "";

// DB接続はCSV本文を出力する前に行う（失敗時に正しく500を返せるようにするため）
$db = open_db();

header("Content-Type: text/plain; charset=utf-8");
echo "driver,season,points\n";

if ($name === "") {
    exit; // 未入力なら何も返さない
}

// y2000, y2001, ... y2026（固定。ユーザー入力ではない）
$cols = implode(", ", array_map(function ($y) { return "y" . $y; }, $years));

// 名前は %name% でバインド（プリペアドステートメント）。最大8人まで。
$stmt = $db->prepare(
    "SELECT driver, $cols FROM f1tbl WHERE driver LIKE :q ESCAPE '\\' ORDER BY driver LIMIT 8"
);
// \ % _ の前に \ を付けて、入力した文字そのものに一致させる
$escaped = addcslashes($name, "\\%_");
$stmt->bindValue(":q", "%" . $escaped . "%", SQLITE3_TEXT);
$result = $stmt->execute();

while ($res = $result->fetchArray(SQLITE3_ASSOC)) {
    // 横持ち(1行27列)を縦持ち(driver,season,points)に展開
    foreach ($years as $y) {
        csv_row([$res["driver"], $y, $res["y" . $y]]);
    }
}
?>
