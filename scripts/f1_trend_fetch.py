#!/usr/bin/env python3
"""F1 シーズン内ポイント推移データ収集スクリプト

各シーズンの「各ラウンド終了時点」のドライバー累積ポイントを取得し、
race_trend.csv として保存する（折れ線グラフ用）。
初回のデータ収集用。現在の正本は data/f1data.db で、CSV は scripts/export_csv.py で DB から書き出す。

出力CSV（ロング形式）:
  season, round, driver, points
"""
import csv
import time
from pathlib import Path

from common import get_json
DATA = Path(__file__).resolve().parent.parent / "data"

YEARS = list(range(2021, 2027))  # 2021〜2026(2026は進行中)
STANDINGS = "https://api.jolpi.ca/ergast/f1/{year}/driverStandings/?format=json&limit=100"
ROUND_STANDINGS = "https://api.jolpi.ca/ergast/f1/{year}/{rnd}/driverStandings/?format=json&limit=100"


def last_round(year):
    """そのシーズンの最終ラウンド番号を返す。"""
    lists = get_json(STANDINGS.format(year=year))["MRData"]["StandingsTable"]["StandingsLists"]
    return int(lists[0]["round"]) if lists else 0


def round_standings(year, rnd):
    """指定ラウンド終了時点のドライバーランキングを返す。"""
    lists = get_json(ROUND_STANDINGS.format(year=year, rnd=rnd))["MRData"]["StandingsTable"]["StandingsLists"]
    return lists[0]["DriverStandings"] if lists else []


def main():
    rows = []
    for year in YEARS:
        n = last_round(year)
        print(f"{year}年: 全{n}戦 取得中", end="", flush=True)
        for rnd in range(1, n + 1):
            for s in round_standings(year, rnd):
                name = f'{s["Driver"]["givenName"]} {s["Driver"]["familyName"]}'
                rows.append([year, rnd, name, s["points"]])
            print(".", end="", flush=True)
            time.sleep(0.6)  # APIへの配慮（レート制限対策）
        print(" 完了")

    with open(str(DATA / "race_trend.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["season", "round", "driver", "points"])
        w.writerows(rows)

    print(f"完了: race_trend.csv ({len(rows)}行)")


if __name__ == "__main__":
    main()
