-- f1data.db のテーブル定義と CSV の取り込み（sqlite3 f1data.db < schema.sql）
-- データの正本は f1data.db。CSV は scripts/export_csv.py で DB から書き出したもの。
-- インデックスは取り込み後に scripts/add_indexes.py で作成する。

-- 年別ポイント（driver + y2000〜y2026）
CREATE TABLE f1tbl(
  driver text,
  y2000 float, y2001 float, y2002 float, y2003 float, y2004 float,
  y2005 float, y2006 float, y2007 float, y2008 float, y2009 float,
  y2010 float, y2011 float, y2012 float, y2013 float, y2014 float,
  y2015 float, y2016 float, y2017 float, y2018 float, y2019 float,
  y2020 float, y2021 float, y2022 float, y2023 float, y2024 float,
  y2025 float, y2026 float
);

-- シーズン内ポイント推移
CREATE TABLE racetbl(season integer, round integer, driver text, points float);

-- 年×ドライバー×所属チーム（コンストラクターズ集計の JOIN 元）
CREATE TABLE teamtbl(season integer, driver text, team text);

-- 年別ポイントの縦持ち（SUM 集計・副問い合わせ・窓関数に使う）
CREATE TABLE pointstbl(season integer, driver text, points float);

-- 予選グリッドと決勝順位（追い上げ・後退。grid=0 はピットレーンスタート）
CREATE TABLE gridtbl(season integer, round integer, driver text, grid integer, finish integer, status text);

-- 周回ごとの順位（レース展開）
CREATE TABLE laptbl(season integer, round integer, driver text, lap integer, position integer);

-- 取得済みレースの一覧（レース展開の選択肢・タイトル用）
CREATE TABLE raceinfo(season integer, round integer, name text, laps integer);

.mode csv
.import --skip 1 f1data.csv f1tbl
.import --skip 1 race_trend.csv racetbl
.import --skip 1 team_data.csv teamtbl
.import --skip 1 points_long.csv pointstbl
.import --skip 1 grid.csv gridtbl
.import --skip 1 laps.csv laptbl
.import --skip 1 raceinfo.csv raceinfo
