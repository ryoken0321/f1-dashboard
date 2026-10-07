"""データ収集スクリプトで共通に使うヘルパー。"""
import json
import time
import urllib.error
import urllib.request


def get_json(url, retries=6):
    """URL から JSON を取得する。429(レート制限)時は待機してリトライする。"""
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=30) as res:
                return json.load(res)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                wait = 5 * (attempt + 1)
                print(f"[429:{wait}s待機]", end="", flush=True)
                time.sleep(wait)
                continue
            raise
