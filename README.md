# WORKVERSE for iroiro Co. — 3D仮想オフィス・業務管理プラットフォーム（初期プロトタイプ）

「仕事をするほど、オフィスが進化する。」

React + TypeScript + Vite + Three.js（React Three Fiber / drei）で構築した、3D仮想オフィス型の業務管理アプリです。
有料AI API・外部3Dアセットは使用せず、3Dモデルはすべてジオメトリとプログラム生成テクスチャで作っています。

## iroiro Co. 向け設定

- チーム：EC運営 / グラフィック / WEB制作 / 動画編集 / SNS運用（各チームに3Dオフィスの専用エリア）
- オーナー：I.OKADA（岡田 斎稀）— オーナー室の専用デスクに着席、頭上の矢印と足元のリングが目印
- メンバー表示名：名前の頭文字 + 苗字のローマ字（例：S.SATO）
- ロゴ：`public/iroiro-logo.png`（原本）、`iroiro-logo-white.png` / `iroiro-mark-white.png`（ダークUI用の白抜き）
- 制作データ：サイドバー「制作データ」からチーム宛にファイルをアップロード。該当チームのメンバー全員に通知が届きます
- アバター解放：個人レベルが上がると髪型・服・アクセサリー・着ぐるみ（くま Lv3 / ねこ Lv5 / うさぎ Lv7 / パンダ Lv9 / きょうりゅう Lv12 / ペンギン Lv15）が選べるようになります
- スマホ対応：下部タブバー、チップ式のチーム切替、ボトムシート、スマホでは自動で軽量描画

## 起動方法

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 型チェック + 本番ビルド（dist/）
npm run preview    # ビルド結果の確認
```

## 操作方法

| 操作 | 内容 |
| --- | --- |
| 左ドラッグ | 視点の回転 |
| 右ドラッグ / 2本指 | 視点の移動（パン） |
| ホイール / ピンチ | ズーム |
| 画面下のボタン | 回転・ズーム・「全体表示」 |
| 社員アバターをクリック | 情報パネル表示 + カメラ移動 |
| 左の部署リスト / 3D上の部署ラベル | 部署へカメラ移動・ハイライト・統計表示 |

1. ログイン画面で「デモユーザーで出勤する」（または任意の社員）を選択すると出勤演出が再生されます。
2. 右の「本日のクエスト」でタスクにチェック → 経験値獲得（1タスクにつき1回のみ）。
3. 「実績」でデイリーミッションの報酬を受け取り、レベルアップ・会社成長を確認できます。
4. ヘッダーのステータスから 出勤中 / 離席中 / 会議中 / 退勤 を切り替えると、アバターがデスク・休憩スペース・会議室へ移動します。

## ディレクトリ構成

```
src/
  types.ts              ドメイン型（業務データ / 3D表示データを分離）
  data/                 デモ初期データ、アバター自動生成
  services/storage.ts   永続化アダプタ（LocalStorage、スキーマバージョン + マイグレーション）
  services/permissions  閲覧権限ポリシー
  store/appStore.ts     業務ロジック（勤怠・タスク・XP台帳・実績・ミッション）
  store/uiStore.ts      一時的なUI状態（選択・カメラ命令・エフェクト・トースト）
  game/rules.ts         レベル曲線・XP・実績・デイリーミッション・オフィス成長
  three/                3Dシーン（建物・部署エリア・家具・アバター・カメラ・エフェクト）
  ui/                   ヘッダー・サイドバー・パネル・各画面
```

## 設計メモ

- **データ分離**: `business`（社員・部署・タスク等）と `presentation`（アバター設定）を分けて保存。3D配置は `three/placements.ts` が業務データから毎回算出し、保存しません。
- **サーバー移行**: ストアは `StorageAdapter` インターフェースのみに依存。API/リアルタイム同期のアダプタに差し替え可能です。
- **XP不正防止**: XPは台帳（`xpLedger`）に `refId`（`task:<id>` / `mission:<日付>:<id>`）付きで記録し、同じ refId は二度と付与しません。
- **勤怠**: タブ再読み込みはセッション継続。ブラウザを閉じても勤怠は「出勤中」のまま保持し、ログイン画面から再開できます。明示的な「退勤」のみ OFF にします。日付をまたいだ未退勤は最終操作時刻で自動退勤します。
- **パフォーマンス**: デスク・椅子・植物は `Merged`（InstancedMesh）で部品単位に描画、共有ジオメトリ/マテリアル、シャドウマップ更新の間引き、非表示ビューでは `frameloop="demand"`。設定から「軽量」モードに切替可能。WebGL非対応時は2Dフロアマップを表示します。

## 公開（GitHub Pages）

`main` ブランチに push すると `.github/workflows/deploy.yml` が自動でビルドし、
`https://<GitHubユーザー名>.github.io/<リポジトリ名>/` に公開されます
（リポジトリの Settings → Pages → Source を「GitHub Actions」にしてください）。

## Firestore / Cloud Storage との同期（任意）

未設定の場合はブラウザ内（LocalStorage / IndexedDB）に保存されます。複数のPC・スマホで同じオフィスを共有するには：

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成し、Web アプリを追加
2. Authentication → ログイン方法 →「匿名」を有効化
3. Firestore Database を作成し、`firebase/firestore.rules` の内容をルールに設定
4. （制作ファイルも共有する場合）Storage を有効化（Blaze プランが必要）し、`firebase/storage.rules` を設定
5. ローカルでは `.env.example` を `.env` にコピーして値を入力。GitHub Pages では
   リポジトリの Settings → Secrets and variables → Actions に同名のシークレットを登録
   （`VITE_FIREBASE_USE_STORAGE` / `VITE_WORKSPACE_ID` は Variables に登録）

設定後は「設定 → データ管理」に同期状態が表示されます。データは `workspaces/{VITE_WORKSPACE_ID}/state/*` にキー単位で保存され、
他の端末の変更はリアルタイムに反映されます。

> 注意：初期版の認証は匿名ログインのため、公開URLを知っている人は誰でもデータを閲覧・編集できます。
> 実運用ではメール/Googleログインと、メンバーのみ許可するルールへの変更を推奨します。
