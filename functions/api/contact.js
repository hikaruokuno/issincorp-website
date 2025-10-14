const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const siteName = '一進総業株式会社';
const fromEmail = 'noreply@sendmail-hp.com';
const adminEmail = 'info@issin-sougyou.com';

const serviceLabels = {
  construction: '建築・改修工事について',
  event: 'イベント設営・仮設工事について',
  exterior: '外構工事・ランドスケープについて',
  maintenance: '設備メンテナンスについて',
  partnership: '協力会社・パートナーについて',
  others: 'その他',
};

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendEmail(apiKey, payload) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Resend API error');
  }
  return data;
}

export async function onRequestPost({ request, env }) {
  // Handle OPTIONS requests routed here
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: '無効なリクエスト形式です。' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const {
      name = '',
      email = '',
      phone = '',
      service = '',
      company = '',
      message = '',
      website = '',
    } = body;

    // Honeypot spam check
    if (website) {
      console.log('Honeypot triggered. Treating as success.');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'お問い合わせありがとうございます。確認次第ご連絡いたします。',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      return new Response(
        JSON.stringify({ error: '必須項目が入力されていません。' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not configured.');
      return new Response(
        JSON.stringify({ error: 'メール送信設定が未完了です。' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const safeMessageHtml = escapeHtml(trimmedMessage).replace(/\n/g, '<br>');
    const safeMessageText = trimmedMessage;
    const displayService = serviceLabels[service] || '未選択';

    try {
      await sendEmail(apiKey, {
        from: fromEmail,
        to: adminEmail,
        reply_to: trimmedEmail,
        subject: `【${siteName}】お問い合わせを受信しました`,
        html: `
          <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <h2 style="margin-bottom: 16px;">お問い合わせを受信しました</h2>
            <p><strong>お名前:</strong> ${escapeHtml(trimmedName)}</p>
            <p><strong>会社名:</strong> ${company ? escapeHtml(company.trim()) : '記載なし'}</p>
            <p><strong>メールアドレス:</strong> ${escapeHtml(trimmedEmail)}</p>
            <p><strong>電話番号:</strong> ${phone ? escapeHtml(phone.trim()) : '記載なし'}</p>
            <p><strong>ご相談内容の種別:</strong> ${escapeHtml(displayService)}</p>
            <p><strong>お問い合わせ内容:</strong></p>
            <div style="padding: 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0;">
              ${safeMessageHtml}
            </div>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #475569;">
              このメールは ${siteName} のお問い合わせフォームから送信されました。
            </p>
          </div>
        `,
        text: `
${siteName}のWebサイトで新しいお問い合わせを受信しました。

お名前: ${trimmedName}
会社名: ${company ? company.trim() : '記載なし'}
メールアドレス: ${trimmedEmail}
電話番号: ${phone ? phone.trim() : '記載なし'}
ご相談内容の種別: ${displayService}

お問い合わせ内容:
${safeMessageText}

---
このメールは ${siteName} のお問い合わせフォームから送信されました。
        `.trim(),
      });
    } catch (error) {
      console.error('Failed to send admin notification email:', error);
      return new Response(
        JSON.stringify({ error: 'メール送信に失敗しました。' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    try {
      await sendEmail(apiKey, {
        from: fromEmail,
        to: trimmedEmail,
        subject: `【${siteName}】お問い合わせありがとうございます`,
        html: `
          <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; line-height: 1.6;">
            <h2 style="color: #0f172a;">お問い合わせありがとうございます</h2>
            <p>${escapeHtml(trimmedName)} 様</p>
            <p>
              ${siteName} へのお問い合わせ誠にありがとうございます。<br />
              以下の内容でお問い合わせを承りました。担当者より改めてご連絡差し上げますので、しばらくお待ちください。
            </p>
            <div style="margin: 24px 0; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px;"><strong>お名前:</strong> ${escapeHtml(trimmedName)}</p>
              <p style="margin: 0 0 8px;"><strong>会社名:</strong> ${company ? escapeHtml(company.trim()) : '記載なし'}</p>
              <p style="margin: 0 0 8px;"><strong>メールアドレス:</strong> ${escapeHtml(trimmedEmail)}</p>
              <p style="margin: 0 0 8px;"><strong>電話番号:</strong> ${phone ? escapeHtml(phone.trim()) : '記載なし'}</p>
              <p style="margin: 0 0 16px;"><strong>ご相談内容の種別:</strong> ${escapeHtml(displayService)}</p>
              <p style="margin: 0 0 8px;"><strong>お問い合わせ内容:</strong></p>
              <div style="white-space: pre-wrap; background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">${safeMessageHtml}</div>
            </div>
            <p style="font-size: 13px; color: #475569;">
              ※このメールは自動送信です。返信いただいてもお返事できませんのでご了承ください。<br />
              ※お急ぎの場合は ${adminEmail} まで直接ご連絡ください。
            </p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #94a3b8;">
              ${siteName}<br />
              〒300-0823 茨城県土浦市小松一丁目24番37号
            </p>
          </div>
        `,
        text: `
${trimmedName} 様

この度は${siteName}へお問い合わせいただき誠にありがとうございます。
以下の内容でお問い合わせを承りました。

お名前: ${trimmedName}
会社名: ${company ? company.trim() : '記載なし'}
メールアドレス: ${trimmedEmail}
電話番号: ${phone ? phone.trim() : '記載なし'}
ご相談内容の種別: ${displayService}

お問い合わせ内容:
${safeMessageText}

担当者より改めてご連絡いたしますので、しばらくお待ちください。

※このメールは自動送信です。返信いただいてもお返事できませんのでご了承ください。
※お急ぎの場合は ${adminEmail} まで直接ご連絡ください。
        `.trim(),
      });
    } catch (error) {
      console.error('Failed to send auto-reply email:', error);
      // Continue without failing the request
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'お問い合わせありがとうございます。確認次第ご連絡いたします。',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Unexpected error during contact submission:', error);
    return new Response(
      JSON.stringify({ error: 'サーバーエラーが発生しました。' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}
