# Cloudflare Pages Functions + Resend によるお問い合わせフォーム実装ガイド

このガイドは、AI（Claude等）がCloudflare Pages FunctionsとResendを使用してお問い合わせフォームを実装する際の完全な手順書です。

## 🔔 このサイト向け設定メモ

- Functionsエンドポイント：`/api/contact`（`functions/api/contact.js`）
- 管理者宛メール：`info@issin-sougyou.com`
 - 送信元メール：`noreply@sendmail-hp.com` ※Resendに登録したドメインを使用
- 必須環境変数：`RESEND_API_KEY`（Cloudflare Pages > Settings > Environment variables > Add variable > Secret）

## 📋 前提条件

- GitHubリポジトリが存在する
- Cloudflare Pagesでサイトがデプロイされている
- HTMLフォームが存在する

## 🔧 実装手順

### 1. Resend の設定

#### 1.1 アカウント作成とAPIキー取得
```
1. https://resend.com にアクセス
2. サインアップ（GitHubアカウントで登録可能）
3. ダッシュボード → API Keys → Create API Key
4. APIキーをコピーして保存（re_xxxxx形式）
```

#### 1.2 ドメイン設定
```
1. Resend Dashboard → Domains → Add Domain
2. 送信用ドメインを入力（例: sendmail-hp.com）
3. 表示されるDNSレコードをすべてメモ：
   - SPFレコード（TXT）
   - DKIMレコード x2（TXT）
   - DMARCレコード（TXT）※推奨
```

### 2. Cloudflare でのDNS設定

```
1. Cloudflare Dashboard → ドメイン選択 → DNS
2. ResendのDNSレコードをすべて追加：
   - Type: TXT
   - Name: 表示された値
   - Content: 表示された値
   - Proxy status: DNS only
3. Save
4. Resendダッシュボードで「Verify DNS Records」をクリック
5. ステータスが「Verified」になるまで待つ（数分〜数時間）
```

### 2.5 独自ドメインメール（Cloudflare + さくら）を使う場合

Cloudflare を DNS/WEB、さくらのレンタルサーバをメール受信に使うケース向けの手順です。他のサイトでも同じ構成を採用する際のテンプレートとして利用できます。

#### さくら側の準備
- サーバーコントロールパネルで対象ドメインを追加し、初期ドメイン（`example.sakura.ne.jp` 形式）を確認。
- 受信したいメールアドレス（例：`info@your-domain.com`）のメールボックスを作成。
- 迷惑メールフィルタや転送設定が初期状態で有効になっていないか確認しておく。

#### Cloudflare DNS の設定
1. Cloudflare Dashboard → 対象ドメイン → DNS。
2. MX レコードを追加：  
   - Name: `@`  
   - Priority: `10`（任意の数値で可）  
   - Target: さくらの初期ドメイン（例：`example.sakura.ne.jp.`）※末尾のドットを忘れずに  
   - Proxy status: DNS only（灰色雲）
3. 初期ドメインに対する A レコードが存在しない場合は追加（Name: `example`, IPv4: さくら提供の値, Proxy: DNS only）。
4. 反映確認：`dig +short MX your-domain.com` で MX が解決することを確認。

#### 動作確認
- Gmail 等の外部アドレスから `info@your-domain.com` へ送信し、さくらの Web メールで受信できるか確認。
- Resend からフォーム経由で送信し、Resend Dashboard → Logs で `Delivered` になっているか、拒否された場合は理由を確認。

> Cloudflare が DNS を管理している限り、MX レコードは Cloudflare 側に設定する必要があります。未設定だと受信サーバーが見つからず、`info@...` 宛メールが届かないので注意してください。

### 3. Pages Functions の実装

#### 3.1 ディレクトリ構造
```
project-root/
├── functions/
│   └── api/
│       └── contact.js
├── index.html
└── script.js
```

#### 3.2 contact.js の作成
`functions/api/contact.js`を作成：

```javascript
export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS request for CORS
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    // Parse request body
    const body = await context.request.json();
    const {
      name,
      email,
      phone,
      subject,
      message,
      website // ハニーポットフィールド（スパム対策）
    } = body;

    // ハニーポットチェック（ボットはこのフィールドに入力してしまう）
    if (website) {
      console.log('Spam detected: honeypot field filled');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'お問い合わせありがとうございます。'
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Validate input
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({
          error: '必須項目が入力されていません'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Get API key from environment variable
    const RESEND_API_KEY = context.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set');
      return new Response(
        JSON.stringify({
          error: 'サーバー設定エラー'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // 管理者への通知メール送信
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@YOUR-DOMAIN.com', // TODO: Resendに登録したドメインのメールアドレスに変更
        to: 'admin@example.com', // TODO: 管理者のメールアドレスに変更
        subject: '【サイト名】お問い合わせ',
        reply_to: email,
        html: `
          <h2>お問い合わせを受信しました</h2>
          <p><strong>お名前:</strong> ${name}</p>
          <p><strong>メールアドレス:</strong> ${email}</p>
          <p><strong>電話番号:</strong> ${phone || 'なし'}</p>
          <p><strong>お問い合わせ種別:</strong> ${subject || 'なし'}</p>
          <p><strong>お問い合わせ内容:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            このメールは「サイト名」のお問い合わせフォームから送信されました。
          </p>
        `,
        text: `
お問い合わせを受信しました

お名前: ${name}
メールアドレス: ${email}
電話番号: ${phone || 'なし'}
お問い合わせ種別: ${subject || 'なし'}
お問い合わせ内容:
${message}

---
このメールは「サイト名」のお問い合わせフォームから送信されました。
        `,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return new Response(
        JSON.stringify({
          error: 'メール送信に失敗しました'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // お問い合わせ者への自動返信メール送信（オプション）
    const autoReplyResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@YOUR-DOMAIN.com', // TODO: 変更
        to: email,
        subject: '【サイト名】お問い合わせありがとうございます',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>お問い合わせありがとうございます</h2>
            <p>${name} 様</p>
            <p>
              この度はお問い合わせいただき、誠にありがとうございます。<br>
              以下の内容でお問い合わせを承りました。
            </p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>お名前:</strong> ${name}</p>
              <p><strong>メールアドレス:</strong> ${email}</p>
              <p><strong>電話番号:</strong> ${phone || 'なし'}</p>
              <p><strong>お問い合わせ種別:</strong> ${subject || 'なし'}</p>
              <p><strong>お問い合わせ内容:</strong></p>
              <p style="white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <p>
              内容を確認の上、担当者より改めてご連絡させていただきます。<br>
              今しばらくお待ちくださいませ。
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              ※このメールは自動送信されています。<br>
              ※このメールに返信いただいても、お返事できませんのでご了承ください。
            </p>
          </div>
        `,
        text: `
${name} 様

この度はお問い合わせいただき、誠にありがとうございます。
以下の内容でお問い合わせを承りました。

------------------
お名前: ${name}
メールアドレス: ${email}
電話番号: ${phone || 'なし'}
お問い合わせ種別: ${subject || 'なし'}
お問い合わせ内容:
${message}
------------------

内容を確認の上、担当者より改めてご連絡させていただきます。
今しばらくお待ちくださいませ。

※このメールは自動送信されています。
※このメールに返信いただいても、お返事できませんのでご了承ください。
        `,
      }),
    });

    const autoReplyData = await autoReplyResponse.json();
    
    if (!autoReplyResponse.ok) {
      console.error('Auto-reply email failed:', autoReplyData);
      // 自動返信が失敗しても、管理者へのメールは送信済みなので成功として扱う
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'お問い合わせありがとうございます。確認次第ご連絡いたします。'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({
        error: 'サーバーエラーが発生しました'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

### 4. フロントエンドの実装

#### 4.1 HTMLフォーム
```html
<form id="contact-form">
  <div>
    <label for="name">お名前 <span style="color: red;">*</span></label>
    <input type="text" id="name" name="name" required>
  </div>
  
  <div>
    <label for="email">メールアドレス <span style="color: red;">*</span></label>
    <input type="email" id="email" name="email" required>
  </div>
  
  <div>
    <label for="phone">電話番号</label>
    <input type="tel" id="phone" name="phone">
  </div>
  
  <div>
    <label for="subject">お問い合わせ種別</label>
    <select id="subject" name="subject">
      <option value="">選択してください</option>
      <option value="商品について">商品について</option>
      <option value="その他">その他</option>
    </select>
  </div>
  
  <div>
    <label for="message">お問い合わせ内容 <span style="color: red;">*</span></label>
    <textarea id="message" name="message" rows="5" required></textarea>
  </div>
  
  <!-- ハニーポット（スパム対策用の見えないフィールド） -->
  <div style="position: absolute; left: -9999px;">
    <label for="website">Website</label>
    <input type="text" id="website" name="website" tabindex="-1" autocomplete="off">
  </div>
  
  <button type="submit">送信する</button>
</form>

<div id="form-message" style="display: none;"></div>
```

#### 4.2 JavaScript（script.js）
```javascript
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const formMessage = document.getElementById('form-message');
    const submitButton = this.querySelector('button[type="submit"]');
    
    // 送信ボタンを無効化
    submitButton.disabled = true;
    submitButton.textContent = '送信中...';
    
    // FormDataをJSONに変換
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      subject: formData.get('subject'),
      message: formData.get('message'),
      website: formData.get('website') // ハニーポット
    };
    
    try {
      // Pages FunctionsのAPIエンドポイント
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // 成功メッセージ
        formMessage.textContent = result.message || 'お問い合わせありがとうございます。';
        formMessage.style.color = 'green';
        formMessage.style.display = 'block';
        
        // フォームをリセット
        this.reset();
      } else {
        // エラーメッセージ
        formMessage.textContent = result.error || 'エラーが発生しました。';
        formMessage.style.color = 'red';
        formMessage.style.display = 'block';
      }
    } catch (error) {
      console.error('Error:', error);
      formMessage.textContent = 'ネットワークエラーが発生しました。';
      formMessage.style.color = 'red';
      formMessage.style.display = 'block';
    } finally {
      // 送信ボタンを有効化
      submitButton.disabled = false;
      submitButton.textContent = '送信する';
      
      // メッセージを5秒後に非表示
      setTimeout(() => {
        formMessage.style.display = 'none';
      }, 5000);
    }
  });
}
```

### 5. Cloudflare Pages での環境変数設定

```
1. Cloudflare Dashboard にログイン
2. Workers & Pages → 対象プロジェクト選択
3. Settings → Environment variables
4. Add variable をクリック
5. 以下を設定：
   - Variable name: RESEND_API_KEY
   - Value: Resendで取得したAPIキー
   - Type: Secret を選択（重要）
6. Save をクリック
```

### 6. デプロイ

```bash
# 変更をコミット
git add .
git commit -m "feat: お問い合わせフォーム実装"
git push

# Cloudflare Pagesが自動的にデプロイを開始
# 数分後にサイトが更新される
```

### 7. 動作確認

```
1. サイトのお問い合わせフォームにアクセス
2. テストデータを入力して送信
3. 以下を確認：
   - 管理者メールアドレスに通知メールが届く
   - お問い合わせ者に自動返信メールが届く
   - フォームに成功メッセージが表示される
```

## 🔍 トラブルシューティング

### メールが届かない場合

1. **Cloudflare Dashboard でログを確認**
   - Workers & Pages → プロジェクト → Functions → リアルタイムログ
   - エラーメッセージを確認

2. **環境変数の確認**
   - RESEND_API_KEY が正しく設定されているか
   - Production環境に設定されているか

3. **DNSレコードの確認**
   - ResendダッシュボードでDomain Verifiedになっているか
   - SPF、DKIM、DMARCレコードが正しく設定されているか

4. **メールアドレスの確認**
   - contact.js内のfromアドレスがResendに登録したドメインか
   - toアドレスが正しいか

### CORSエラーが出る場合

- contact.jsのcorsHeadersが正しく設定されているか確認
- OPTIONS リクエストのハンドリングがあるか確認

## 📝 カスタマイズポイント

### 必ず変更が必要な箇所

1. **contact.js**
   - `from: 'noreply@YOUR-DOMAIN.com'` → Resendに登録したドメインのメールアドレス
   - `to: 'admin@example.com'` → 管理者のメールアドレス
   - `【サイト名】` → 実際のサイト名

2. **HTMLフォーム**
   - フィールドの追加/削除に応じてcontact.jsも修正

3. **メールテンプレート**
   - 会社情報、住所、電話番号など

### オプション設定

1. **自動返信メールの無効化**
   - contact.jsの自動返信部分をコメントアウトまたは削除

2. **スパム対策の強化**
   - reCAPTCHA v3の追加
   - レート制限の実装（Cloudflare KV使用）

3. **複数サイトでの利用**
   - 同じResendアカウント、同じドメインを使用可能
   - 件名やメール本文でサイトを識別

## 📊 料金情報

- **Resend**: 無料プラン = 月3,000通まで
- **Cloudflare Pages**: 無料（月500回のビルド、無制限のリクエスト）

## 🎯 この実装のメリット

1. **サーバーレス** - サーバー管理不要
2. **無料** - 小規模サイトなら完全無料
3. **高速** - Cloudflareのエッジネットワーク使用
4. **セキュア** - APIキーは環境変数で管理
5. **スパム対策** - ハニーポット実装済み
6. **メンテナンスフリー** - アップデート不要

## 💡 Tips

- テスト時は自分のメールアドレスで確認
- 本番環境では必ずSecretタイプで環境変数を設定
- DNSレコードの反映には時間がかかる場合がある（最大48時間）
- Resendダッシュボードでメール送信履歴を確認可能

---

このガイドに従えば、AIアシスタントが新しいプロジェクトに同じお問い合わせフォーム機能を実装できます。
