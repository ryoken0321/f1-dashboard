#!/usr/bin/env python3
"""F1データ収集スクリプト
Jolpica API(Ergastの後継, 無料)から2000-2026年(2026は進行中)の
ドライバーランキングを取得し、f1data.csv として保存する。
初回のデータ収集用。現在の正本は data/f1data.db で、CSV は scripts/export_csv.py で DB から書き出す。

出力CSVの構造:
  driver(text), y2000, y2001, ..., y2026  ... 各年の獲得ポイント
  行 = ドライバー / 列 = 年ごとのポイント
"""
import csv
import time
from pathlib import Path

from common import get_json
DATA = Path(__file__).resolve().parent.parent / "data"

YEARS = list(range(2000, 2027))  # 2000〜2026年(2026は進行中の途中経過)
API = "https://api.jolpi.ca/ergast/f1/{year}/driverStandings/?format=json&limit=100"


def fetch_standings(year):
    """指定年のドライバーランキングを取得して返す。"""
    data = get_json(API.format(year=year))
    lists = data["MRData"]["StandingsTable"]["StandingsLists"]
    return lists[0]["DriverStandings"] if lists else []


def main():
    drivers = {}   # driverId -> {"name": str, "pts": {year: float}}
    order = []     # 初登場順を保持

    for year in YEARS:
        print(f"  取得中: {year}年 ...", end="", flush=True)
        standings = fetch_standings(year)
        for s in standings:
            did = s["Driver"]["driverId"]
            full = f'{s["Driver"]["givenName"]} {s["Driver"]["familyName"]}'
            if did not in drivers:
                drivers[did] = {"name": full, "pts": {}}
                order.append(did)
            drivers[did]["pts"][year] = float(s["points"])
        print(f" {len(standings)}人")
        time.sleep(0.5)  # APIへの配慮

    with open(str(DATA / "f1data.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["driver"] + [f"y{y}" for y in YEARS])
        for did in order:
            d = drivers[did]
            # 各年のポイント（その年に出走していなければ 0）
            row = [d["name"]] + [d["pts"].get(y, 0) for y in YEARS]
            w.writerow(row)

    print(f"完了: f1data.csv ({len(order)}人のドライバー)")


if __name__ == "__main__":
    main()
