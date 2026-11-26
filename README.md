# 星麦みる 公式サイト（GitHub Pages 版）

GPT Sites から移行した、保守しやすい静的サイトです。**更新は `data/site.json` を書き換えるだけ**。

## 構成
- `index.html` … ページの骨組み（基本さわらない）
- `assets/style.css` / `assets/app.js` … 見た目と描画
- `data/site.json` … お知らせ・スケジュール・ギャラリー・動画・リンク・ガイドライン
- `assets/img/` … ロゴ・キービジュアルなど小さな固定画像だけ

## 画像・動画は Google ドライブ
1. ドライブにアップロード → 共有を「**リンクを知っている全員（閲覧者）**」にする
2. 共有リンク（`https://drive.google.com/file/d/xxxx/view` 形式）をそのまま `drive` に貼る
   - ギャラリー: `{ "title": "...", "category": "...", "drive": "共有リンク" }`
   - 動画: `{ "title": "...", "drive": "共有リンク" }`（YouTube なら `"youtube": "動画ID"`）
3. `drive` が空なら `src`（サイト内画像）が使われます

※ ドライブ画像は `drive.google.com/thumbnail` 経由で表示します。大量アクセス時に表示制限がかかることがあるため、キービジュアルなど重要な画像は `assets/img/` に置くのがおすすめ。

## ローカル確認
```
python3 -m http.server 8000
```
→ http://localhost:8000

## 公開（GitHub Pages）
1. GitHub で新しいリポジトリ（例 `miru-site`）を作成し、このフォルダの中身を push
2. Settings → Pages → Branch: `main` / `(root)` を選択
3. 数分で `https://<ユーザー名>.github.io/miru-site/` に公開
4. 独自ドメインは後から Settings → Pages → Custom domain で設定可能

## 更新を Claude に頼むとき
「お知らせに◯◯を追加して」「このドライブ画像をギャラリーに追加して」と伝えれば `data/site.json` を更新します。
