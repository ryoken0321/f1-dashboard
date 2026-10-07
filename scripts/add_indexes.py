#!/usr/bin/env python3
"""f1data.db に検索・集計用のインデックスを張るスクリプト（何度実行してもOK）。

各 WebAPI の WHERE / JOIN / GROUP BY で使う列にインデックスを作り、
データ量が増えても応答が速くなるようにする（DB設計の工夫）。

使い方:  python3 scripts/add_indexes.py
"""
import sqlite3
from pathlib import Path
DATA = Path(__file__).resolve().parent.parent / "data"

DB = str(DATA / "f1data.db")

INDEXES = [
    # trend_api / drama_api：シーズン×ラウンドで絞る
    ("idx_race_season_round", "racetbl(season, round)"),
    # gap_api：シーズンで絞って集計
    ("idx_grid_season", "gridtbl(season)"),
    # alltime_api / champions_api：シーズン・ドライバーで集計/結合
    ("idx_points_season_driver", "pointstbl(season, driver)"),
    # constructor_api / h2h_api：チーム所属の結合キー
    ("idx_team_season_driver", "teamtbl(season, driver)"),
    # laps_api：レース展開（シーズン×ラウンド×周回）
    ("idx_lap_season_round_lap", "laptbl(season, round, lap)"),
]


def main():
    con = sqlite3.connect(DB)
    c = con.cursor()
    for name, target in INDEXES:
        c.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {target}")
        print(f"OK: {name} ON {target}")
    con.commit()

    # 統計情報を更新してクエリプランを最適化
    c.execute("ANALYZE")
    con.commit()
    con.close()
    print("完了: インデックス作成 + ANALYZE を実行しました。")


if __name__ == "__main__":
    main()
