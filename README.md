# AI動画クリッピングツール

YouTube、Instagram、X(Twitter)の動画URLから、AIが最適なハイライトを分析し、バズる縦動画コンテンツを自動生成するツールです。

## 🚀 機能

- **YouTube動画分析**: AIが動画の内容を分析し、テーマを抽出
- **AIクリップ生成**: 最適な切り抜きポイントを自動選択
- **動画アップロード**: ローカル動画ファイルのアップロードと処理
- **カスタマイズ設定**: 切り抜き時間、本数、ターゲット層の調整
- **予算見積もり**: AI API使用料の事前計算

## 🛠️ 技術スタック

### フロントエンド
- React 19.1.1
- Vite 7.1.6
- Tailwind CSS 4.1.13
- JavaScript (ES6+)

### バックエンド
- Python 3.11
- Google Cloud Functions
- Google Gemini API
- YouTube Data API v3

## 📦 セットアップ

### 前提条件
- Node.js 18+
- Python 3.11+
- Google Cloud CLI
- Google Cloud プロジェクト

### インストール

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd clips_ai
```

2. **フロントエンドの依存関係をインストール**
```bash
npm install
```

3. **バックエンドの依存関係をインストール**
```bash
cd backend
pip install -r requirements.txt
```

### 環境変数の設定

**重要**: セキュリティのため、APIキーは環境変数で管理してください。

#### 開発環境

`.env.local`ファイルを作成し、以下の環境変数を設定：

```env
# Gemini API Key (必須)
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here

# API Base URL
VITE_API_BASE_URL=http://localhost:8080

# Token Estimation Settings (USD per 1K tokens)
VITE_TOKEN_COST_PER_1K_INPUT=0.00075
VITE_TOKEN_COST_PER_1K_OUTPUT=0.003
```

#### 本番環境

GitHub Secretsで以下の環境変数を設定：

**フロントエンド用（必須）:**
- `VITE_GEMINI_API_KEY`: 実際のGemini APIキー
- `VITE_API_BASE_URL`: バックエンドAPIのURL

**フロントエンド用（オプション）:**
- `VITE_TOKEN_COST_PER_1K_INPUT`: 入力トークンコスト（デフォルト: 0.00075）
- `VITE_TOKEN_COST_PER_1K_OUTPUT`: 出力トークンコスト（デフォルト: 0.003）

**バックエンド用（参考）:**
- `GEMINI_API_KEY`: バックエンド用Gemini APIキー
- `YOUTUBE_API_KEY`: YouTube Data API v3キー

### 開発サーバーの起動

1. **フロントエンド開発サーバー**
```bash
npm run dev
```

2. **バックエンドCloud Function（ローカル）**
```bash
cd backend
GEMINI_API_KEY=your_gemini_api_key YOUTUBE_API_KEY=your_youtube_api_key functions-framework --target=analyze_video --port=8080
```

3. **ブラウザでアクセス**
http://localhost:5173

## 🚀 デプロイ

### Google Cloud Functionへのデプロイ

```bash
cd backend
gcloud functions deploy analyze_video \
  --gen2 \
  --runtime=python311 \
  --region=asia-northeast1 \
  --source=. \
  --entry-point=analyze_video \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars=GEMINI_API_KEY=your_gemini_api_key,YOUTUBE_API_KEY=your_youtube_api_key
```

### フロントエンドの本番ビルド

```bash
npm run build
```

## 📱 使用方法

1. **YouTube URL分析**
   - URL入力欄にYouTube動画のURLを入力
   - 「接続テスト」ボタンをクリック
   - AIが動画の内容を分析し、テーマを抽出

2. **動画アップロード**
   - 「アップロード」タブを選択
   - ローカルの動画ファイルを選択
   - アップロード完了後、分析を実行

3. **クリップ生成**
   - 設定を調整（切り抜き時間、本数など）
   - 「AIクリップ生成開始」ボタンをクリック
   - 生成されたクリップを確認・ダウンロード

## ⚙️ 設定オプション

- **切り抜き時間**: 10-180秒の範囲で調整
- **切り抜き本数**: 1-15本の範囲で調整
- **ターゲット層**: 全般、10代〜20代、ビジネスパーソンなど
- **投稿のトーン**: 親しみやすく、ユーモラス、フォーマルなど

## 🔧 開発

### プロジェクト構造

```
clips_ai/
├── src/
│   ├── components/          # Reactコンポーネント
│   ├── services/           # API呼び出しサービス
│   └── App.jsx            # メインアプリケーション
├── backend/
│   ├── main.py            # Cloud Functionメインコード
│   └── requirements.txt   # Python依存関係
├── public/                # 静的ファイル
└── package.json          # Node.js依存関係
```

### コマンド

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# プレビュー
npm run preview

# リント
npm run lint
```

## 📄 ライセンス

MIT License

## 🤝 貢献

プルリクエストやイシューの報告を歓迎します。

## 📞 サポート

問題が発生した場合は、GitHubのIssuesで報告してください。