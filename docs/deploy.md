# EC2 への構築手順

Amazon Linux 2023 の EC2 に、Apache + PHP + SQLite で構築する手順です。

## 1. 事前準備（AWS コンソール）

- EC2 インスタンス（Amazon Linux 2023）を起動する
- セキュリティグループのインバウンドで HTTP（80）を許可する

## 2. ソフトウェアのインストール（EC2 上）

```bash
sudo dnf -y install httpd php php-cli php-fpm sqlite
sudo systemctl enable --now httpd php-fpm
```

Amazon Linux 2023 では、PHP の SQLite3 拡張は `php` の依存で入る `php-pdo` パッケージに含まれ、JSON は PHP 本体に組み込まれています（`php -m` に `sqlite3` が出れば OK）。
パッケージ名はディストリビューションやそのバージョンによって異なる場合があります。

## 3. ファイルの配置

```bash
# ローカルから転送
scp -i <鍵ファイル>.pem -r public data ec2-user@<EC2のIP>:~

# EC2 上で配置（public をドキュメントルートに、data はその外に置く）
sudo mkdir -p /var/www/data
sudo cp -r ~/public/* /var/www/html/
sudo cp ~/data/f1data.db /var/www/data/
sudo systemctl reload httpd
```

`api/db.php` は `../../data/f1data.db` を読むため、`/var/www/html/api/` から見て `/var/www/data/f1data.db` に置きます。

## 4. DB を CSV から作り直す場合

データの正本は `data/f1data.db` です。`data/*.csv` は `scripts/export_csv.py` で DB から書き出したもので、
`schema.sql` は 7 テーブルすべてを定義して CSV を取り込みます（インデックスは `add_indexes.py` で作成）。

```bash
cd data
rm -f f1data.db
sqlite3 f1data.db < schema.sql
python3 ../scripts/add_indexes.py
```

## 5. 動作確認

```
http://<EC2のIP>/index.html                    年別ランキング
http://<EC2のIP>/api/api.php?fieldname=y2025   年別 API 単体（CSV）
http://<EC2のIP>/api/laps_api.php?list=1       レース一覧 API 単体（CSV）
```

## トラブルシューティング

| 症状 | 確認すること |
|---|---|
| ブラウザでアクセスできない | セキュリティグループの HTTP(80) 許可、`sudo systemctl status httpd` |
| PHP がそのまま表示される | `php-fpm` の起動と `sudo systemctl reload httpd` |
| HTTP 500（DB を開けない） | `/var/www/data/f1data.db` の配置と読み取り権限 |
| グラフが出ない | ブラウザの開発者ツールの Console で API のパスを確認 |
