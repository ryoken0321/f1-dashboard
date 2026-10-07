# F1 ドライバー成績ダッシュボード

F1 の公開データ（[Jolpica Ergast API](https://api.jolpi.ca/ergast/f1/)）を収集して SQLite に格納し、
PHP の Web API と JavaScript（Chart.js）の画面で可視化するダッシュボードです。一人で作成し、AWS EC2 上に構築しました。

```
[ブラウザ] --HTTP--> [EC2: Apache + PHP] --> [SQLite (data/f1data.db)]
```

## ディレクトリ構成

```
public/          Web 公開ディレクトリ（ドキュメントルート）
  *.html         画面（8画面）
  css/ js/       スタイル・画面ごとのスクリプト
  api/           PHP の Web API（CSV を返す）と DB 接続の共通化 db.php
data/            SQLite データベース（正本）、DB から書き出した CSV、テーブル定義 schema.sql
scripts/         データの収集・更新スクリプト（Python）
docs/deploy.md   EC2 への構築手順
```

DB は公開ディレクトリの外に置き、ブラウザから直接ダウンロードできないようにしています。

## 画面と API

| 画面 | HTML | API |
|---|---|---|
| 年別ランキング（2000〜2026） | index.html | api.php |
| シーズン内ポイント推移 | trend.html | trend_api.php |
| コンストラクターズランキング | constructors.html | constructor_api.php |
| ドライバー検索・キャリア比較 | career.html | career_api.php |
| 歴代通算・王者の系譜 | legends.html | alltime_api.php / champions_api.php |
| チームメイト対決・接戦度 | analysis.html | h2h_api.php / drama_api.php |
| 予選→決勝の追い上げ・後退 | gap.html | gap_api.php |
| レース展開（順位変動） | laps.html | laps_api.php |

- `api/db.php`：全 API が共有する DB 接続（読み取り専用で開く・接続失敗時は HTTP 500 で停止）
- 検索 API はプリペアドステートメントで SQL インジェクションを防いでいます
- パラメータが未指定・範囲外・配列指定などの不正な場合は HTTP 400 を返します

## データの更新

```sh
python3 scripts/update_all.py  # 2026シーズンの順位と、2021年以降のグリッド・周回データを取得し直し、teamdata.js・インデックス・CSV を更新
```

周回データ（レース展開）は `scripts/fetch_laps.py` の `TARGET_RACES` に指定した 2025 年の代表レースのみを取得し直します（最新レースは自動では追加されません）。
`update_all.py` は実行前に DB をバックアップし、失敗した場合は途中で止まります。

## ローカルで動かす

```sh
php -S localhost:8000 -t public
# ブラウザで http://localhost:8000/
```

## データの出典とライセンス

- データ: [Jolpica Ergast API](https://api.jolpi.ca/ergast/f1/)（Ergast 互換の公開 F1 データ API）から取得しています
- コード: [MIT License](LICENSE)
