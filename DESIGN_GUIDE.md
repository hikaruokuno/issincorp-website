# デザインガイド - 一進総業株式会社 ウェブサイト

## デザインコンセプト
- **目的**: 企業の信頼性と専門性を強調
- **印象**: モダン、プロフェッショナル、洗練された
- **ターゲット**: 全国の建設プロジェクト関係者

## カラーパレット

### プライマリカラー
- **背景**: `#0F172A` (濃紺) - メインの暗い背景
- **セカンダリ背景**: `#1E293B` - カード、セクション背景
- **ボーダー**: `#334155` - 境界線、区切り線

### アクセントカラー
- **メインアクセント**: `#3B82F6` (青) - CTA、重要なリンク
- **ホバー**: `#2563EB` - ホバー状態
- **成功**: `#10B981` (緑) - 成功メッセージ
- **警告**: `#F59E0B` (オレンジ) - 注意事項

### テキストカラー
- **プライマリテキスト**: `#F1F5F9` - メインテキスト
- **セカンダリテキスト**: `#94A3B8` - サブテキスト、説明文
- **見出し**: `#FFFFFF` - 重要な見出し

## タイポグラフィ

### フォントファミリー
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### フォントサイズ
- **ヒーロータイトル**: `text-5xl` (48px) - モバイル: `text-3xl`
- **セクションタイトル**: `text-4xl` (36px) - モバイル: `text-2xl`
- **サブタイトル**: `text-2xl` (24px)
- **本文**: `text-lg` (18px)
- **小テキスト**: `text-sm` (14px)

### フォントウェイト
- **見出し**: `font-bold` (700)
- **サブ見出し**: `font-semibold` (600)
- **本文**: `font-normal` (400)

## レイアウト

### グリッドシステム
- **デスクトップ**: 3カラムグリッド `grid-cols-3`
- **タブレット**: 2カラムグリッド `md:grid-cols-2`
- **モバイル**: 1カラム `grid-cols-1`

### スペーシング
- **セクション間**: `py-20` (80px)
- **要素間**: `space-y-8` (32px)
- **カード内パディング**: `p-8` (32px)
- **ボタンパディング**: `px-8 py-4`

### コンテナ
```html
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

## コンポーネントスタイル

### ボタン
```html
<!-- プライマリボタン -->
<button class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105">

<!-- セカンダリボタン -->
<button class="border-2 border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300">
```

### カード
```html
<div class="bg-slate-800 border border-slate-700 rounded-xl p-8 hover:border-blue-500 transition-all duration-300">
```

### フォーム要素
```html
<!-- インプット -->
<input class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors">

<!-- テキストエリア -->
<textarea class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors">
```

## アニメーション

### トランジション
- **デフォルト**: `transition-all duration-300`
- **ホバーエフェクト**: `transform hover:scale-105`
- **フェードイン**: `opacity-0 animate-fade-in`

### ホバーエフェクト
- ボタン: スケール拡大 + 背景色変更
- カード: ボーダー色変更
- リンク: 下線表示 or カラー変更

## レスポンシブデザイン

### ブレークポイント
- **sm**: 640px以上
- **md**: 768px以上
- **lg**: 1024px以上
- **xl**: 1280px以上
- **2xl**: 1536px以上

### モバイルファースト
```html
<!-- モバイル → タブレット → デスクトップ -->
<div class="text-3xl md:text-4xl lg:text-5xl">
```

## アイコン

### 使用アイコン
- **チェックマーク**: ✓ - サービスリスト
- **矢印**: → - リンク、CTA
- **メール**: ✉ - 連絡先
- **電話**: ☎ - 電話番号
- **位置**: 📍 - 住所

## ベストプラクティス

### アクセシビリティ
- 十分なコントラスト比を確保
- フォーカス状態を明確に表示
- セマンティックHTMLを使用
- altテキストを適切に設定

### パフォーマンス
- Tailwind CDNを使用してCSSを最小化
- 画像の遅延読み込み
- 不要なJavaScriptを避ける

### SEO
- 適切なメタタグ設定
- 構造化データの実装
- セマンティックHTMLの使用
- 高速なページ読み込み

## 実装例

### ヒーローセクション
```html
<section class="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
  <div class="max-w-7xl mx-auto px-4 text-center">
    <h1 class="text-5xl md:text-6xl font-bold text-white mb-6">
      タイトル
    </h1>
    <p class="text-xl text-slate-300 mb-8">
      説明文
    </p>
    <button class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-lg">
      CTA
    </button>
  </div>
</section>
```

### サービスカード
```html
<div class="bg-slate-800 border border-slate-700 rounded-xl p-8 hover:border-blue-500 transition-all">
  <h3 class="text-2xl font-semibold text-white mb-4">
    サービス名
  </h3>
  <p class="text-slate-300">
    サービス説明
  </p>
</div>
```

## 再利用のためのチェックリスト

- [ ] カラーパレットをプロジェクトに合わせて調整
- [ ] フォントファミリーを必要に応じて変更
- [ ] ロゴとブランディング要素を更新
- [ ] コンテンツをプロジェクトに合わせて置換
- [ ] フォーム送信先を設定（Formspreeなど）
- [ ] メタタグとSEO情報を更新
- [ ] ファビコンを設定
- [ ] アナリティクスコードを追加（必要に応じて）