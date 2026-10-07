<?php
/*
 * constructor_api.php ― コンストラクターズ(チーム)ランキング WebAPI
 *
 * season(年)を受け取り、その年の「チーム別 合計ポイント」を CSV で返す。
 * f1tbl(年別ポイント) と teamtbl(年×ドライバー×チーム) を JOIN し、
 * チーム単位で SUM + GROUP BY 集計する。
 *
 *   例) constructor_api.php?season=2025
 *       -> team,points
 *          McLaren,833
 *          Mercedes,469
 *          ...
 *
 * 【安全対策】
 *   ・年カラム名(y2025 等)は許可リストで検証してから使う（列名はバインド不可のため）
 *   ・season は整数バインド(プリペアドステートメント)で渡す
 *   ・season が未指定・範囲外・配列指定なら HTTP 400
 *   ※ その年に出走した全チームを返す（0ポイントのチームも含む）。
 *   ※ 所属チームは「その年の最終在籍チーム」基準のため、シーズン途中の移籍は
 *     最終チームに合算される近似値である点に注意。
 */

require_once __DIR__ . "/db.php";

// 集計できる年（2000〜2026）の整数のみ受け付ける
$season = param_int("season", SEASON_FIRST, SEASON_LAST);
$col = "y" . $season; // 範囲チェック済みの整数から組み立てるので安全

header("Content-Type: text/plain; charset=utf-8");

$db = open_db();
$stmt = $db->prepare(
    "SELECT t.team AS team, SUM(f.$col) AS points
       FROM f1tbl f
       JOIN teamtbl t ON f.driver = t.driver
      WHERE t.season = :s
      GROUP BY t.team
      ORDER BY points DESC, t.team"
);
$stmt->bindValue(":s", $season, SQLITE3_INTEGER);
$result = $stmt->execute();

echo "team,points\n";
while ($res = $result->fetchArray(SQLITE3_ASSOC)) {
    csv_row([$res["team"], $res["points"]]);
}
?>
