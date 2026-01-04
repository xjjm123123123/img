export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = request.body ? JSON.parse(request.body) : {};
    const app_id = body.app_id || process.env.FEISHU_APP_ID || '';
    const app_secret = body.app_secret || process.env.FEISHU_APP_SECRET || '';
    const bitable_app_token = body.bitable_app_token;
    const bitable_table_id = body.bitable_table_id;
    const name_field_name = body.name_field_name || 'name';
    const activity_name = body.activity_name;

    if (!bitable_app_token || !bitable_table_id || !activity_name) {
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

    const filter_obj = {
      conjunction: 'and',
      conditions: [{
        field_name: name_field_name,
        operator: 'is',
        value: [activity_name]
      }]
    };

    const filter_str = JSON.stringify(filter_obj);
    const filter_encoded = encodeURIComponent(filter_str);

    const records_response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${bitable_app_token}/tables/${bitable_table_id}/records?filter=${filter_encoded}&page_size=100`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (records_response.status !== 200) {
      const error_data = await records_response.json();
      throw new Error(error_data.msg || '搜索记录失败');
    }

    const result = await records_response.json();

    if (result.data && result.data.items && result.data.items.length > 0) {
      response.status(200).json({ record_id: result.data.items[0].record_id });
    } else {
      response.status(200).json({ record_id: null });
    }

  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
