<?php
/*
 * drama_api.php ― 接戦度・首位交代 分析 WebAPI
 *
 * racetbl(各ラウンド累積ポイント, 2021-2026) から、各シーズンの
 *   ・首位交代回数（ランキング1位が入れ替わった回数）
 *   ・最終ポイント差（王者と2位の差）
 *   ・王者 / 2位
 * を算出して返す。SQLで取り出した推移を PHP で集計する。
 *
 * 同点の扱い（結果が毎回同じになるように決めておく）:
 *   ・首位が同点のラウンドは、直前の首位がその中にいれば首位のまま（交代に数えない）
 *   ・それ以外の同点はドライバー名の昇順で並べる
 *
 * 出力: season,leadChanges,finalMargin,champion,runnerup
 */

header("Content-Type: text/plain; charset=utf-8");
require_once __DIR__ . "/db.php";
$db = open_db();

echo "season,leadChanges,finalMargin,champion,runnerup\n";

for ($s = RACE_SEASON_FIRST; $s <= SEASON_LAST; $s++) {
    $stmt = $db->prepare("SELECT round, driver, points FROM racetbl WHERE season = :s ORDER BY round, driver");
    $stmt->bindValue(":s", $s, SQLITE3_INTEGER);
    $res = $stmt->execute();

    $byRound = []; // round => [ [points, driver], ... ]
    while ($r = $res->fetchArray(SQLITE3_ASSOC)) {
        $byRound[(int)$r["round"]][] = [(float)$r["points"], $r["driver"]];
    }
    if (!$byRound) {
        continue;
    }
    ksort($byRound);

    $leader = null;
    $changes = 0;
    $lastSorted = [];
    foreach ($byRound as $arr) {
        // ポイント降順、同点は名前の昇順
        usort($arr, function ($a, $b) { return ($b[0] <=> $a[0]) ?: strcmp($a[1], $b[1]); });
        $top = $arr[0][1];
        // 直前の首位がトップと同点なら首位のまま
        foreach ($arr as [$pts, $drv]) {
            if ($pts < $arr[0][0]) {
                break;
            }
            if ($drv === $leader) {
                $top = $leader;
                break;
            }
        }
        if ($leader !== null && $top !== $leader) {
            $changes++;
        }
        $leader = $top;
        $lastSorted = $arr;
    }

    $champion = $lastSorted[0][1];
    $runner = isset($lastSorted[1]) ? $lastSorted[1][1] : "";
    $margin = isset($lastSorted[1]) ? ($lastSorted[0][0] - $lastSorted[1][0]) : 0;

    csv_row([$s, $changes, $margin, $champion, $runner]);
}
?>
