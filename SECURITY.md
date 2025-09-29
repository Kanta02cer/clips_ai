# セキュリティポリシー

## サポートされているバージョン

| バージョン | サポート状況 |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## 脆弱性の報告

このプロジェクトでセキュリティの脆弱性を発見した場合は、以下の手順で報告してください。

## 報告方法

1. **GitHubのIssues**で「Security」ラベルを付けて報告
2. **プライベートメッセージ**で直接連絡

## 対応時間

- 重大な脆弱性: 24時間以内
- 中程度の脆弱性: 72時間以内
- 軽微な脆弱性: 1週間以内

## 環境変数の設定

### 開発環境

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_API_BASE_URL=http://localhost:8080
VITE_TOKEN_COST_PER_1K_INPUT=0.00075
VITE_TOKEN_COST_PER_1K_OUTPUT=0.003
```

### 本番環境

GitHub Secretsで以下の環境変数を設定してください：

- `GEMINI_API_KEY`: Gemini APIキー
- `API_BASE_URL`: バックエンドAPIのURL

## セキュリティベストプラクティス

1. **APIキーは環境変数で管理**
2. **`.env`ファイルはGitにコミットしない**
3. **本番環境ではSecretsを使用**
4. **定期的なセキュリティ監査**

## ライセンス

このセキュリティポリシーはMITライセンスの下で公開されています。
