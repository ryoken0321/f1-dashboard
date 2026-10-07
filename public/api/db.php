<?php
/*
 * db.php ― SQLite 接続と入力チェックの共通ヘルパー
 *
 * 各 WebAPI で重複していた `new SQLite3("f1data.db")` を一箇所にまとめ、
 *   - 接続失敗（DB欠損・破損など）を捕捉し、HTTP 500 とメッセージで安全に停止
 *   - 読み取り専用(READONLY)で開く（APIは参照のみ。誤更新・破壊を防ぐ安全対策）
 *   - ロック時に少し待つ(busyTimeout)
 *   - クエリ失敗も例外にして HTTP 500 で止める（スタックトレースやパスを出さない）
 * を共通化する。API側は  require_once __DIR__ . "/db.php";  $db = open_db();  だけでよい。
 *
 * あわせて、GET パラメータの読み取り・検証（不正なら HTTP 400）と CSV 出力のヘルパーも置く。
 */

// API が受け付けるシーズンの範囲（各APIの許可リストはここから作る）。
// 年は f1tbl の列（y2000〜）や画面の選択肢にもあるため、シーズンを増やすときはそれらも合わせて直す
const SEASON_FIRST = 2000;      // f1tbl / pointstbl / teamtbl（年単位のデータ）
const SEASON_LAST = 2026;
const RACE_SEASON_FIRST = 2021; // racetbl / gridtbl / laptbl（ラウンド単位のデータ）

// 想定外の例外（クエリ失敗など）は 500 + 短いメッセージだけ返す
set_exception_handler(function (Throwable $e) {
    if (!headers_sent()) {
        http_response_code(500);
        header("Content-Type: text/plain; charset=utf-8");
    }
    echo "error: サーバー内部でエラーが発生しました\n";
});

function open_db($path = null) {
    // DB は公開ディレクトリの外（../../data）に置き、ブラウザから直接ダウンロードできないようにする
    $path = $path ?? __DIR__ . "/../../data/f1data.db";
    try {
        // READONLY: 存在しないと自動生成せずに失敗させる（空DBでの誤動作を防ぐ）
        $db = new SQLite3($path, SQLITE3_OPEN_READONLY);
        $db->enableExceptions(true); // query/prepare の失敗を例外にする（上の handler で 500）
        $db->busyTimeout(3000);
        return $db;
    } catch (Throwable $e) {
        http_response_code(500);
        if (!headers_sent()) {
            header("Content-Type: text/plain; charset=utf-8");
        }
        echo "error: データベースに接続できませんでした\n";
        exit;
    }
}

/** HTTP 400 と短いメッセージを返して終了する */
function bad_request($message) {
    http_response_code(400);
    header("Content-Type: text/plain; charset=utf-8");
    echo "error: " . $message . "\n";
    exit;
}

/**
 * GET パラメータを文字列で返す（前後の空白は除去）。未指定なら null。
 * ?name[]=x のような配列指定は文字列でないので 400 にする。
 */
function param_str($name) {
    if (!isset($_GET[$name])) {
        return null;
    }
    if (!is_string($_GET[$name])) {
        bad_request($name . " が不正です");
    }
    return trim($_GET[$name]);
}

/** 必須の整数パラメータを返す。未指定・数字以外・範囲外は 400 */
function param_int($name, $min, $max) {
    $v = param_str($name);
    if ($v === null || $v === "") {
        bad_request($name . " を指定してください");
    }
    if (!ctype_digit($v) || (int)$v < $min || (int)$v > $max) {
        bad_request($name . " は " . $min . "〜" . $max . " の整数で指定してください");
    }
    return (int)$v;
}

/** CSV の1行を出力する。カンマ・ダブルクォート・改行を含む値だけ "..." で囲む */
function csv_row(array $fields) {
    $out = [];
    foreach ($fields as $f) {
        $s = (string)$f;
        if (strpbrk($s, ",\"\r\n") !== false) {
            $s = '"' . str_replace('"', '""', $s) . '"';
        }
        $out[] = $s;
    }
    echo implode(",", $out) . "\n";
}
