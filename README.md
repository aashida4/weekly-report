# Weekly Report

学生・研究者向けの「週次タスク管理 + 振り返り + LLMフィードバック」Webアプリ。
週単位でタスクと達成状況を記録し、Ollama 上のLLMに「目標設定」「目標遂行」のアドバイスをワンクリックで生成させます。

## 技術スタック
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite（`/data/app.db` を Docker ボリュームに永続化）
- Auth.js v5 (Credentials Provider + bcrypt)
- Ollama HTTP API（リモートサーバーを `OLLAMA_BASE_URL` で指定）
- Markdown editor: `@uiw/react-md-editor`

## クイックスタート（Docker / 本番）

```bash
cp .env.example .env
# AUTH_SECRET と OLLAMA_BASE_URL を編集

docker compose up --build -d
# http://localhost:3000

# 初期ユーザー（admin / student1）を投入
docker compose exec app npx prisma db seed
# admin@example.com / student1@example.com (password: password123)
```

## 開発（Docker, ホットリロード）

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## 開発（ローカル, Docker なし）

```bash
npm install
cp .env.example .env
npx prisma db push        # SQLite を prisma/dev.db に作成
npx prisma db seed        # 初期ユーザー投入
npm run dev
```

> **DB を作り直したとき** は古いブラウザの認証 Cookie が無効になります。アプリ側で
> 自動的に検知し、`/login?error=stale` にリダイレクトして再ログインを促します。
> Cookie を手動で消す場合は DevTools → Application → Cookies → `authjs.*` を削除。

## LLM 連携（Ollama / OpenAI 切替可）
`.env` の `LLM_PROVIDER` で `ollama` か `openai` を選択します。

**Ollama を使う場合** (`LLM_PROVIDER=ollama`)
- `OLLAMA_BASE_URL` を研究室サーバの URL（例: `http://lab-gpu:11434`）に設定。
- `OLLAMA_MODEL` で使用モデルを指定（例: `llama3.1:8b`）。
- Docker から **ホスト** の Ollama に接続したい場合は `OLLAMA_BASE_URL=http://host.docker.internal:11434`。

**OpenAI API を使う場合** (`LLM_PROVIDER=openai`)
- `OPENAI_API_KEY` を設定（必須）。
- `OPENAI_MODEL`（既定 `gpt-4o-mini`）でモデルを指定。
- `OPENAI_BASE_URL` で Azure OpenAI 等の互換エンドポイントに差し替え可能（既定 `https://api.openai.com/v1`）。

週次ページ下部の「目標設定アドバイス」「目標遂行アドバイス」ボタンで生成。結果と送信プロンプトは `Feedback` テーブルに履歴として保存されます。

## 主な画面
| パス | 用途 |
|---|---|
| `/` | ランディング（未ログイン時） |
| `/dashboard` | 全タスク横断ビュー（検索・未完了フィルタ） |
| `/weeks` | 自分の週一覧 |
| `/weeks/[isoYear]/[isoWeek]` | 週次ページ（タスク / 振り返り / Feedback） |
| `/admin` | 管理者ダッシュボード（ロール=admin） |
| `/admin/users/:id/weeks/...` | 管理者用 読み取り専用ビュー |
| `/admin/export` | CSV / JSON エクスポート |

## 認可ポリシー
- 学生は **自分の週報のみ閲覧・編集可**。他ユーザーの URL に直接アクセスしても 404/403。
- 管理者は **全ユーザーの週報を閲覧可**、ただし他ユーザーの **書き込みは不可**。エクスポートは admin のみ。

## 環境変数
| 変数 | 用途 |
|---|---|
| `DATABASE_URL` | SQLite ファイルパス。Prisma は `file:` の相対パスを `prisma/schema.prisma` の場所基準で解決します。ローカルは `file:./dev.db` (→ `prisma/dev.db`)、Docker では絶対パス `file:/data/app.db`。 |
| `AUTH_SECRET` | Auth.js JWT 署名キー（`openssl rand -base64 32`） |
| `AUTH_TRUST_HOST` | Auth.js: リバースプロキシ配下で `true` |
| `LLM_PROVIDER` | `ollama` (既定) または `openai` |
| `OLLAMA_BASE_URL` | Ollama サーバー URL（provider=ollama 時） |
| `OLLAMA_MODEL` | 使用モデル名（provider=ollama 時） |
| `OPENAI_API_KEY` | OpenAI API キー（provider=openai 時、必須） |
| `OPENAI_MODEL` | OpenAI モデル名（例: `gpt-4o-mini`） |
| `OPENAI_BASE_URL` | OpenAI 互換エンドポイント（Azure 等）。省略時は公式 |
| `ALLOW_SIGNUP` | `false` で自己サインアップを無効化（管理者発行のみ） |

## スクリプト
| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | Prisma generate + Next.js build |
| `npm start` | 本番サーバー起動 |
| `npm run typecheck` | TypeScript 型チェック |
| `npm run db:push` | スキーマを DB に反映（マイグレーション履歴なし） |
| `npm run db:migrate` | マイグレーション作成・適用 |
| `npm run db:seed` | 初期ユーザー投入 |
| `npm run db:studio` | Prisma Studio |
