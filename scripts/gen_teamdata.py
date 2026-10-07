#!/usr/bin/env python3
"""DB の teamtbl から public/js/teamdata.js（フロント用のドライバー→チーム表）を作り直すスクリプト。

ネットワークには接続しない。update_2026.py で teamtbl に新ドライバーが入ったあと、
画面側のチームカラー・所属表示にも反映させるために使う（update_all.py から呼ばれる）。

使い方:  python3 scripts/gen_teamdata.py
"""
import json
import sqlite3
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

DB = str(ROOT / "data" / "f1data.db")
OUT = ROOT / "public" / "js" / "teamdata.js"


def main():
    con = sqlite3.connect(DB)
    data = {}  # year(str) -> { "Full Name": "Team" }（DB に入っている順）
    for season, driver, team in con.execute(
        "SELECT season, driver, team FROM teamtbl ORDER BY season, rowid"
    ):
        data.setdefault(str(season), {})[driver] = team
    con.close()

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("// 自動生成: 各年のドライバー所属チーム（gen_teamdata.py / teamtbl から生成）\n")
        f.write("window.TEAM_DATA = ")
        json.dump(data, f, ensure_ascii=False, indent=0)
        f.write(";\n")

    print(f"完了: teamdata.js を出力（{len(data)}シーズン）")


if __name__ == "__main__":
    main()
