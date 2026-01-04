export default async function handler(request, response) {
  if (request.method !== 'PUT') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { record_id } = request.query;
    const body = request.body ? JSON.parse(request.body) : {};
    const app_id = body.app_id || process.env.FEISHU_APP_ID || '';
    const app_secret = body.app_secret || process.env.FEISHU_APP_SECRET || '';
    const bitable_app_token = body.bitable_app_token;
    const bitable_table_id = body.bitable_table_id;
    const fields = body.fields || {};

    if (!bitable_app_token || !bitable_table_id || !record_id) {
      return response.status(400).json({ error: '缺少必要参数' });
    }

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

    const record_response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${bitable_app_token}/tables/${bitable_table_id}/records/${record_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: fields })
      }
    );

    if (record_response.status !== 200) {
      const error_data = await record_response.json();
      throw new Error(error_data.msg || '更新记录失败');
    }

    const result = await record_response.json();
    response.status(200).json(result);

  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
