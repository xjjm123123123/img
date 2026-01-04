export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = request.body ? JSON.parse(request.body) : {};
    const app_id = body.app_id || process.env.FEISHU_APP_ID || '';
    const app_secret = body.app_secret || process.env.FEISHU_APP_SECRET || '';

    if (!app_id) {
      return response.status(400).json({ error: '缺少 App ID' });
    }

    const auth_response = await fetch(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: app_id,
          app_secret: app_secret
        })
      }
    );

    if (auth_response.status !== 200) {
      throw new Error('获取访问令牌失败');
    }

    const auth_data = await auth_response.json();
    const access_token = auth_data.tenant_access_token;

    if (!access_token) {
      throw new Error('无效的访问令牌');
    }

    response.status(200).json({ access_token: access_token });

  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
