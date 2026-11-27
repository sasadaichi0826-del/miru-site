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

## 観察基地の演出（2026-11-27 Phase 1）
- 演出は `assets/play.js` / `assets/play.css`。動きの時間は `play.css` 冒頭の CSS 変数（`--t-hover` など）で一元管理。
- `site.json` に追加したキー：`room`（部屋とホットスポット）、`reactions`（みるの台詞）、`greetings`（時間帯の挨拶・再訪）、`daily`（きょうの なんで？）、`discoveries`（観察カード12枚）、`discoveryReward`（全部集めたときのおまけ）、`emptyStates`（予定が空のとき）、`wallpapers.timeOfDay`（時間帯ごとの最初の壁紙）。
- 新しい台詞・文言はすべて `draft: true`（本番では非表示）。`?draft=1` で確認、`?debug=1` で全演出を手動で発火できる（`&tod=evening` で時間帯も切替）。本人確認が済んだら `draft` を外す。
- 部屋の絵が届いたら `room.image.pc` / `room.image.sp` に webp のパスを入れ、ホットスポットの座標（%）を合わせる。
- 「うごきをへらす」トグルの状態は localStorage の `miru-motion`。観察カードは `miru-cards`、訪問回数は `miru-visits`。

## 一覧サムネイル

ギャラリーの `thumb` は `assets/gallery/` 内の一覧用画像です。原寸画像の `drive` は保持し、クリック時の拡大表示に使います。Googleドライブのサムネイル埋め込みが閲覧環境によって失敗するため、一覧用画像198件（合計約21MB）はGitHub Pagesから配信しています。
