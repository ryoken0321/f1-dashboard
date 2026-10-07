#!/usr/bin/env python3
"""予選グリッド vs 決勝順位を取得して gridtbl に投入するスクリプト。

各レースの「スタート位置(grid)」と「決勝の最終順位(position)」を Jolpica(Ergast) API から取得。
画面「追い上げ・後退」で「予選→決勝で何ポジション上げた/下げたか」を可視化するための元データ。

  - gridtbl : (season, round, driver, grid, finish, status)
              grid=0 はピットレーンスタート。finish は最終クラス順位（DNFも順位が付く）。

使い方:  python3 scripts/fetch_grid.py
"""
import sqlite3
import time
from pathlib import Path

from common import get_json
DATA = Path(__file__).resolve().parent.parent / "data"

DB = str(DATA / "f1data.db")
SEASONS = range(2021, 2027)
RESULTS = "https://api.jolpi.ca/ergast/f1/{y}/{r}/results/?format=json&limit=100"


def name_of(s):
    return f'{s["Driver"]["givenName"]} {s["Driver"]["familyName"]}'


def main():
    con = sqlite3.connect(DB)
    c = con.cursor()
    c.execute(
        "CREATE TABLE IF NOT EXISTS gridtbl("
        "season integer, round integer, driver text, "
        "grid integer, finish integer, status text)"
    )
    c.execute("DELETE FROM gridtbl")  # 毎回まるごと洗い替え

    total = 0
    for y in SEASONS:
        # そのシーズンに存在するラウンドは racetbl から把握（無ければスキップ）
        rounds = [r[0] for r in c.execute(
            "SELECT DISTINCT round FROM racetbl WHERE season=? ORDER BY round", (y,)
        ).fetchall()]
        if not rounds:
            print(f"{y}: racetbl にラウンド情報なし → スキップ")
            continue
        print(f"{y}年: {len(rounds)}ラウンド ", end="", flush=True)
        for rnd in rounds:
            data = get_json(RESULTS.format(y=y, r=rnd))
            races = data["MRData"]["RaceTable"]["Races"]
            results = races[0]["Results"] if races else []
            for s in results:
                grid = int(s.get("grid", 0))
                finish = int(s.get("position", 0))
                c.execute(
                    "INSERT INTO gridtbl(season, round, driver, grid, finish, status) "
                    "VALUES(?,?,?,?,?,?)",
                    (y, rnd, name_of(s), grid, finish, s.get("status", "")),
                )
            total += len(results)
            print(f"R{rnd}", end=" ", flush=True)
            time.sleep(0.6)
        print()

    con.commit()
    con.close()
    print(f"完了: gridtbl を {total} 行で再構築しました。")


if __name__ == "__main__":
    main()
