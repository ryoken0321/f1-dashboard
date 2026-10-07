#!/usr/bin/env python3
"""レース中の「周回ごとの順位」を取得して laptbl に投入するスクリプト。

Jolpica(Ergast) API の /laps から、各ラップの全ドライバーの走行順位を取得し、
「レース展開チャート（順位変動の折れ線）」の元データにする。

  - laptbl   : (season, round, driver, lap, position)
  - raceinfo : (season, round, name, laps)  … 画面のレース選択肢＆タイトル用

/laps の driverId（例: max_verstappen）は、同じレースの /results から
「氏名（Given Family）」へ変換して保存する（他テーブルと表記を揃える）。

対象レースは TARGET_RACES で指定（データ量が多いので絞る）。増やしたい時はここに追記。

使い方:  python3 scripts/fetch_laps.py
"""
import sqlite3
import time
from pathlib import Path

from common import get_json
DATA = Path(__file__).resolve().parent.parent / "data"

DB = str(DATA / "f1data.db")

# 取得対象（データ量が大きいので代表レースに絞る）。season -> [round, ...]
TARGET_RACES = {
    2025: [1, 5, 10, 14, 19, 24],
}

RESULTS = "https://api.jolpi.ca/ergast/f1/{y}/{r}/results/?format=json&limit=100"
LAPS = "https://api.jolpi.ca/ergast/f1/{y}/{r}/laps/?format=json&limit=100&offset={o}"


def name_map_and_meta(y, r):
    """results から driverId→氏名 の辞書とレース名を得る。"""
    data = get_json(RESULTS.format(y=y, r=r))
    races = data["MRData"]["RaceTable"]["Races"]
    if not races:
        return {}, None
    race = races[0]
    names = {}
    for res in race["Results"]:
        d = res["Driver"]
        names[d["driverId"]] = f'{d["givenName"]} {d["familyName"]}'
    return names, race["raceName"]


def fetch_all_laps(y, r):
    """/laps を全ページ取得して [(lap, driverId, position), ...] を返す。"""
    out = []
    offset = 0
    while True:
        data = get_json(LAPS.format(y=y, r=r, o=offset))["MRData"]
        total = int(data["total"])
        races = data["RaceTable"]["Races"]
        laps = races[0]["Laps"] if races else []
        for lap in laps:
            n = int(lap["number"])
            for t in lap["Timings"]:
                out.append((n, t["driverId"], int(t["position"])))
        offset += 100
        time.sleep(0.5)
        if offset >= total:
            break
    return out


def main():
    con = sqlite3.connect(DB)
    c = con.cursor()
    c.execute(
        "CREATE TABLE IF NOT EXISTS laptbl("
        "season integer, round integer, driver text, lap integer, position integer)"
    )
    c.execute(
        "CREATE TABLE IF NOT EXISTS raceinfo("
        "season integer, round integer, name text, laps integer)"
    )

    for y, rounds in TARGET_RACES.items():
        for r in rounds:
            # 再取得のため対象レースの既存行を消す（洗い替え）
            c.execute("DELETE FROM laptbl WHERE season=? AND round=?", (y, r))
            c.execute("DELETE FROM raceinfo WHERE season=? AND round=?", (y, r))

            names, race_name = name_map_and_meta(y, r)
            time.sleep(0.5)
            rows = fetch_all_laps(y, r)
            max_lap = max((lp for lp, _, _ in rows), default=0)

            for lap, drv_id, pos in rows:
                driver = names.get(drv_id, drv_id)  # 変換できなければIDのまま
                c.execute(
                    "INSERT INTO laptbl(season, round, driver, lap, position) VALUES(?,?,?,?,?)",
                    (y, r, driver, lap, pos),
                )
            c.execute(
                "INSERT INTO raceinfo(season, round, name, laps) VALUES(?,?,?,?)",
                (y, r, race_name, max_lap),
            )
            con.commit()
            print(f"{y} R{r}: {race_name} / {max_lap}周 / {len(rows)}行")

    con.close()
    print("完了: laptbl / raceinfo を構築しました。")


if __name__ == "__main__":
    main()
