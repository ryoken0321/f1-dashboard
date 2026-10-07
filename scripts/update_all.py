#!/usr/bin/env python3
"""F1データを一括で最新化するオーケストレーションスクリプト。

新しいレースが終わったら、これ1本で以下を順に実行する:
  1. update_2026.py   … 2026シーズンの最新スタンディングを洗い替え
  2. fetch_grid.py    … 予選グリッド/決勝順位（追い上げ画面用）を再取得
  3. fetch_laps.py    … レース展開用の周回データを再取得（TARGET_RACES に指定した固定レースのみ）
  4. gen_teamdata.py  … teamtbl から public/js/teamdata.js を作り直す（新ドライバーを画面に反映）
  5. add_indexes.py   … インデックス作成 + ANALYZE（無ければ作る／統計更新）
  6. export_csv.py    … DB の全テーブルを data/*.csv に書き出す（schema.sql での再構築用）

各ステップは独立プロセスで実行し、失敗したらその時点で中断する（実行前の DB は f1data.db.bak に残る）。

使い方:
  python3 scripts/update_all.py                    # 全部実行
  python3 scripts/update_all.py --skip-standings   # 1 を省く
  python3 scripts/update_all.py --skip-grid        # 2 を省く（時短）
  python3 scripts/update_all.py --skip-laps        # 3 を省く（時短）
"""
import subprocess
import sys
import shutil
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable  # このスクリプトを起動したのと同じ Python を使う
DB = os.path.join(HERE, "..", "data", "f1data.db")

STEPS = [
    ("2026スタンディング更新", "update_2026.py", "--skip-standings"),
    ("グリッド/順位の再取得", "fetch_grid.py", "--skip-grid"),
    ("レース展開(laps)の再取得", "fetch_laps.py", "--skip-laps"),
    ("teamdata.js の再生成", "gen_teamdata.py", None),
    ("インデックス作成", "add_indexes.py", None),
    ("CSV の書き出し", "export_csv.py", None),
]


def run(script):
    print(f"\n{'='*50}\n▶ {script}\n{'='*50}")
    result = subprocess.run([PY, os.path.join(HERE, script)])
    return result.returncode == 0


def main():
    args = set(sys.argv[1:])

    # 実行前にDBをバックアップ（失敗時に戻せるように）
    if os.path.exists(DB):
        shutil.copy(DB, DB + ".bak")
        print(f"バックアップ作成: {DB}.bak")

    ok = True
    for label, script, skip_flag in STEPS:
        if skip_flag and skip_flag in args:
            print(f"\n⏭  スキップ: {label}（{skip_flag}）")
            continue
        print(f"\n### {label}")
        if not run(script):
            print(f"⚠ {script} が失敗しました。中断します。")
            ok = False
            break

    print("\n" + ("✅ 全ステップ完了。" if ok else "❌ 途中で失敗。f1data.db.bak から復旧できます。"))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
