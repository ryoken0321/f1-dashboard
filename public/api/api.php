<?php
/*
 * api.php  ―  F1 WebAPI（年別ランキング）
 *
 * フォーム/セレクターから渡された年（fieldname）をもとに SQL を動的生成し、
 * その年のドライバー別ポイントを CSV 形式で返す。
 *
 *   例) api.php?fieldname=y2024
 *       -> driver,y2024
 *          Max Verstappen,437
 *          Lando Norris,374
 *          ...
 *
 * 【安全対策】
 *   $_GET の値をそのまま SQL に連結するとSQLインジェクションの危険があるため、
 *   受け取った列名（年）は許可リスト($allowed)に含まれる場合のみ使用する。
 *   未指定・許可リスト外・配列指定（fieldname[]=...）は HTTP 400 を返す。
 */

require_once __DIR__ . "/db.php";

// 受け付ける列（年）のホワイトリスト（y2000〜y2026）。これ以外は 400 で拒否する。
$allowed = [];
for ($y = SEASON_FIRST; $y <= SEASON_LAST; $y++) {
    $allowed[] = "y" . $y;
}

$field = param_str("fieldname");
if ($field === null || $field === "") {
    bad_request("fieldname を指定してください（例: y2025）");
}
if (!in_array($field, $allowed, true)) {
    bad_request("fieldname は y" . SEASON_FIRST . "〜y" . SEASON_LAST . " で指定してください");
}
// driver と「選択した年」の2列を、ポイントの多い順に取得。
// その年に0ポイント（=未出走/ノーポイント）の行は除外して見やすくする。
$sql = sprintf(
    "SELECT driver, %s FROM f1tbl WHERE %s > 0 ORDER BY %s DESC, driver",
    $field, $field, $field
);

header("Content-Type: text/plain; charset=utf-8");

$db = open_db();
$result = $db->query($sql);

$first = true;
while ($res = $result->fetchArray(SQLITE3_ASSOC)) {
    if ($first) {
        // 1行目に列名（ヘッダー）を出力する
        csv_row(array_keys($res));
        $first = false;
    }
    csv_row(array_values($res));
}
?>
