# 環境変数設定ガイド

## 🔧 GitHub Secrets設定手順

### 1. GitHubリポジトリにアクセス
https://github.com/Kanta02cer/clips_ai

### 2. Settings → Secrets and variables → Actions

### 3. 以下のSecretsを追加

#### 必須のSecrets

| Secret名 | 説明 | 例 |
|---------|------|-----|
| `VITE_GEMINI_API_KEY` | Gemini APIキー | `AIzaSy...` |
| `VITE_API_BASE_URL` | バックエンドAPIのURL | `https://your-api.com` |

#### オプションのSecrets

| Secret名 | 説明 | デフォルト値 |
|---------|------|-------------|
| `VITE_TOKEN_COST_PER_1K_INPUT` | 入力トークンコスト（USD） | `0.00075` |
| `VITE_TOKEN_COST_PER_1K_OUTPUT` | 出力トークンコスト（USD） | `0.003` |

#### バックエンド用（参考）

| Secret名 | 説明 | 例 |
|---------|------|-----|
| `GEMINI_API_KEY` | バックエンド用Gemini APIキー | `AIzaSy...` |
| `YOUTUBE_API_KEY` | YouTube Data API v3キー | `AIzaSy...` |

## 🏠 ローカル開発環境設定

### 1. 環境変数ファイルを作成

```bash
# プロジェクトルートで実行
touch .env.local
```

### 2. .env.localファイルに以下を記述

```env
# 必須の環境変数
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
VITE_API_BASE_URL=http://localhost:8080

# オプションの環境変数
VITE_TOKEN_COST_PER_1K_INPUT=0.00075
VITE_TOKEN_COST_PER_1K_OUTPUT=0.003
```

### 3. 開発サーバーを起動

```bash
npm run dev
```

## 🔍 環境変数の確認方法

### フロントエンドで確認

```javascript
console.log('Gemini API Key:', import.meta.env.VITE_GEMINI_API_KEY);
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
```

### バックエンドで確認

```python
import os
print('Gemini API Key:', os.environ.get('GEMINI_API_KEY'))
print('YouTube API Key:', os.environ.get('YOUTUBE_API_KEY'))
```

## ⚠️ セキュリティ注意事項

1. **`.env.local`ファイルはGitにコミットしない**
2. **APIキーは絶対にコードに直接記述しない**
3. **本番環境では必ずSecretsを使用**
4. **定期的にAPIキーをローテーション**

## 🚨 トラブルシューティング

### 環境変数が読み込まれない場合

1. ファイル名が`.env.local`であることを確認
2. プロジェクトルートに配置されていることを確認
3. 開発サーバーを再起動

### ビルド時に環境変数が適用されない場合

1. GitHub Secretsが正しく設定されているか確認
2. Secret名が正確であるか確認
3. ワークフローファイルの構文を確認

## 📞 サポート

問題が解決しない場合は、GitHubのIssuesで報告してください。
