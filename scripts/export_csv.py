#!/usr/bin/env python3
"""f1data.db の各テーブルを data/*.csv に書き出すスクリプト。

データの正本は f1data.db。CSV は DB を作り直すため（schema.sql で取り込む）の書き出しで、
update_all.py の最後に実行して DB と CSV の内容を揃える。

使い方:  python3 scripts/export_csv.py
"""
import csv
import sqlite3
from pathlib import Path
DATA = Path(__file__).resolve().parent.parent / "data"

DB = str(DATA / "f1data.db")

# テーブル名 -> 出力ファイル名（schema.sql の .import と対応）
TABLES = [
    ("f1tbl", "f1data.csv"),
    ("racetbl", "race_trend.csv"),
    ("teamtbl", "team_data.csv"),
    ("pointstbl", "points_long.csv"),
    ("gridtbl", "grid.csv"),
    ("laptbl", "laps.csv"),
    ("raceinfo", "raceinfo.csv"),
]


def main():
    con = sqlite3.connect(DB)
    for table, filename in TABLES:
        cur = con.execute(f"SELECT * FROM {table} ORDER BY rowid")
        headers = [d[0] for d in cur.description]
        rows = cur.fetchall()
        nulls = sum(v is None for r in rows for v in r)
        if nulls:
            # .import では空欄が NULL ではなく空文字になるため警告しておく
            print(f"警告: {table} に NULL が {nulls} 個あります（CSV では空欄になります）")
        with open(DATA / filename, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(headers)
            w.writerows(["" if v is None else v for v in r] for r in rows)
        print(f"OK: {table} -> {filename} ({len(rows)}行)")
    con.close()


if __name__ == "__main__":
    main()
