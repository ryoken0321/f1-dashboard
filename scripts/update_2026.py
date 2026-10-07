#!/usr/bin/env python3
"""2026シーズンを最新スタンディングで洗い替えするスクリプト。

新しいレースが終わったら、これを実行 → f1data.db が最新化される。
  - racetbl   : 2026の全ラウンド累積スタンディングを再投入
  - f1tbl     : y2026 列を現在の累積ポイントに更新（新ドライバーは追加）
  - pointstbl : 2026の縦持ちポイントを更新（新ドライバーは追加）
  - teamtbl   : 2026のドライバー→チームを最新に更新

使い方:  python3 scripts/update_2026.py
"""
import sqlite3
import time
from pathlib import Path

from common import get_json
DATA = Path(__file__).resolve().parent.parent / "data"

DB = str(DATA / "f1data.db")
YEAR = 2026
STANDINGS = "https://api.jolpi.ca/ergast/f1/{y}/driverStandings/?format=json&limit=100"
ROUND_STANDINGS = "https://api.jolpi.ca/ergast/f1/{y}/{r}/driverStandings/?format=json&limit=100"


def name_of(s):
    return f'{s["Driver"]["givenName"]} {s["Driver"]["familyName"]}'


def team_of(s):
    cons = s.get("Constructors", [])
    return cons[-1]["name"] if cons else None


def main():
    # --- 現在の累積スタンディング（直近のレースまで） ---
    lists = get_json(STANDINGS.format(y=YEAR))["MRData"]["StandingsTable"]["StandingsLists"]
    if not lists:
        print("2026のスタンディングがまだありません。")
        return
    cur_standings = lists[0]["DriverStandings"]
    last_round = int(lists[0]["round"])
    print(f"2026年: 第{last_round}戦終了時点 / {len(cur_standings)}人")

    con = sqlite3.connect(DB)
    c = con.cursor()

    # --- f1tbl.y2026 / pointstbl / teamtbl を更新 ---
    for s in cur_standings:
        name = name_of(s)
        pts = float(s["points"])
        team = team_of(s)

        c.execute("UPDATE f1tbl SET y2026=? WHERE driver=?", (pts, name))
        if c.rowcount == 0:
            # 新ドライバー：他の年は 0（f1_fetch.py と同じく「出走なし=0」で揃える）
            cols = [f"y{y}" for y in range(2000, YEAR)]
            c.execute(
                f"INSERT INTO f1tbl(driver, {', '.join(cols)}, y2026) "
                f"VALUES(?, {', '.join('0' for _ in cols)}, ?)",
                (name, pts),
            )

        c.execute("UPDATE pointstbl SET points=? WHERE season=? AND driver=?", (pts, YEAR, name))
        if c.rowcount == 0:
            c.execute("INSERT INTO pointstbl(season, driver, points) VALUES(?,?,?)", (YEAR, name, pts))

        if team:
            c.execute("UPDATE teamtbl SET team=? WHERE season=? AND driver=?", (team, YEAR, name))
            if c.rowcount == 0:
                c.execute("INSERT INTO teamtbl(season, driver, team) VALUES(?,?,?)", (YEAR, name, team))

    # --- racetbl: 2026の全ラウンドを入れ直し（累積スタンディング） ---
    c.execute("DELETE FROM racetbl WHERE season=?", (YEAR,))
    total = 0
    for rnd in range(1, last_round + 1):
        rl = get_json(ROUND_STANDINGS.format(y=YEAR, r=rnd))["MRData"]["StandingsTable"]["StandingsLists"]
        rows = rl[0]["DriverStandings"] if rl else []
        for s in rows:
            c.execute(
                "INSERT INTO racetbl(season, round, driver, points) VALUES(?,?,?,?)",
                (YEAR, rnd, name_of(s), float(s["points"])),
            )
        total += len(rows)
        print(f"  R{rnd}: {len(rows)}人", end="  ", flush=True)
        time.sleep(0.6)
    print()

    con.commit()
    con.close()
    print(f"完了: racetbl 2026を{total}行で再構築。f1tbl/pointstbl/teamtblも更新しました。")


if __name__ == "__main__":
    main()
