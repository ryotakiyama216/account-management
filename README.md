# Password Management RAG (MVP)

## これは何のサービスか

このプロジェクトは、**ログイン情報を安全に保存し、チャットで素早く取り出せる**パスワード管理サービスのMVPです。  
ユーザーはサービス名・ID・パスワードを登録し、あとから「Amazonのログイン情報を出して」のように自然文で検索できます。

## 解決したい課題

- 複数サービスのログイン情報を探すのが面倒
- 「どこに保存したか分からない」状態が起きやすい
- 便利さを優先するとセキュリティが弱くなりがち

このMVPは、**検索性（RAG）**と**機密保護（暗号化保存）**を分離して両立します。

## サービスの価値

- **かんたん登録**: Webフォームからすぐ登録可能
- **自然文検索**: チャット形式で目的のログイン情報を検索
- **安全設計**: パスワード本体はRAGへ送らず、暗号化して別管理
- **音声入力拡張しやすい**: Siriショートカット連携で「話して登録」が可能

## 主要ユースケース

1. 新規サービス登録時に、ID/パスワードを保存する  
2. 後日「XXのログイン情報を出して」と問い合わせる  
3. 候補サービスをRAGで特定し、保存済み情報を表示する  

## 仕組み（アーキテクチャ）

- **フロント**: Next.js（App Router）
- **機密保存層**: 暗号化してローカルストア保存（MVPでは `data/credentials.json`）
- **RAG層**: Difyに検索用メタ情報のみ保存（サービス名、ログインID、メモ等）
- **検索フロー**:
  - チャット文を受け取る
  - Dify（任意）で対象サービス名を解決
  - 一致レコードを機密保存層から取得して返す

## セキュリティ方針（重要）

- パスワード本体はRAGに保存しない
- `aes-256-gcm` で暗号化して保存
- 本番では以下を必須化する
  - DB + KMS / Vaultへの移行
  - 認証・認可（ユーザーごとのアクセス制御）
  - 平文表示の前に再認証（step-up auth）
  - 監査ログ、レート制限、鍵ローテーション

## 現在の実装範囲（MVP）

- 登録API: `POST /api/credentials/create`
  - 入力: `serviceName`, `loginId`, `password`, `notes?`
  - 動作: パスワードを暗号化保存、メタ情報をDifyへ登録（設定時）

- 検索API: `POST /api/chat/query`
  - 入力: `query`
  - 動作: Difyで対象サービスを推定（未設定時は簡易解析）、該当情報を返却

- 更新API: `POST /api/credentials/update`
  - 入力: `id`, `serviceName`, `loginId`, `password`, `notes?`
  - 動作: 検索結果をその場で更新し再保存

## セットアップ

1. 依存パッケージをインストール

```bash
npm install
```

2. 環境変数ファイルを作成

```bash
cp env.local.example .env.local
```

3. 暗号化キー（32byte, base64）を生成

```bash
openssl rand -base64 32
```

生成した値を `.env.local` の `CREDENTIAL_ENCRYPTION_KEY` に設定します。

4. （任意）Dify環境変数を設定

- `DIFY_BASE_URL`
- `DIFY_API_KEY`
- `DIFY_DATASET_ID`
- `DIFY_CHAT_APP_ID`

5. 認証用の環境変数を設定

- `AUTH_SECRET`（例: `openssl rand -base64 32`）
- `AUTH_USERS_JSON`（任意: 初期ユーザーを固定で入れたい場合）

例:

```text
AUTH_USERS_JSON=[{"id":"demo-user","name":"Demo User","email":"demo@example.com","password":"demo-pass"}]
```

6. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` を開くと、`/login` または `/signup` から開始できます。  
`/signup` で作成したユーザーは `data/users.json` に保存されます（パスワードはハッシュ化）。

## Siri連携について

初期版は**Swiftなし**で実現可能です。  
最短は「iOSショートカット + Siri音声トリガー + 本APIへのPOST」です。

Swiftを使うのは、次の要件が出たときに検討します。

- 専用iOSアプリUIを作りたい
- App Intentsで深いSiri統合をしたい
- Secure Enclaveなど端末機能を積極活用したい
