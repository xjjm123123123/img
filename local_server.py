from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os

app = Flask(__name__, static_folder='.')
CORS(app)

FEISHU_APP_ID = os.environ.get('FEISHU_APP_ID', '')
FEISHU_APP_SECRET = os.environ.get('FEISHU_APP_SECRET', 'eXdWjCrImmRXGCrNfHCSmdFYUACJyPEv')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

def get_feishu_access_token(app_id, app_secret):
    auth_response = requests.post(
        'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
        json={
            'app_id': app_id,
            'app_secret': app_secret
        }
    )

    if auth_response.status_code != 200:
        raise Exception('获取访问令牌失败')

    auth_data = auth_response.json()
    access_token = auth_data.get('tenant_access_token')

    if not access_token:
        raise Exception('无效的访问令牌')

    return access_token

@app.route('/api/feishu/access_token', methods=['POST'])
def get_access_token():
    try:
        data = request.json
        app_id = data.get('app_id', FEISHU_APP_ID)
        app_secret = data.get('app_secret', FEISHU_APP_SECRET)

        if not app_id:
            return jsonify({'error': '缺少 App ID'}), 400

        access_token = get_feishu_access_token(app_id, app_secret)
        return jsonify({'access_token': access_token})

    except Exception as e:
        print(f'获取访问令牌异常: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/feishu/records/search', methods=['POST'])
def search_feishu_record():
    try:
        data = request.json
        app_id = data.get('app_id', FEISHU_APP_ID)
        app_secret = data.get('app_secret', FEISHU_APP_SECRET)
        bitable_app_token = data.get('bitable_app_token')
        bitable_table_id = data.get('bitable_table_id')
        name_field_name = data.get('name_field_name', 'name')
        activity_name = data.get('activity_name')

        if not bitable_app_token or not bitable_table_id or not activity_name:
            return jsonify({'error': '缺少必要参数'}), 400

        if not app_id:
            return jsonify({'error': '缺少 App ID'}), 400

        access_token = get_feishu_access_token(app_id, app_secret)

        filter_obj = {
            'conjunction': 'and',
            'conditions': [{
                'field_name': name_field_name,
                'operator': 'is',
                'value': [activity_name]
            }]
        }

        import json
        from urllib.parse import quote
        filter_str = json.dumps(filter_obj, ensure_ascii=False)
        filter_encoded = quote(filter_str)

        print(f'搜索飞书记录 - URL: https://open.feishu.cn/open-apis/bitable/v1/apps/{bitable_app_token}/tables/{bitable_table_id}/records')
        print(f'搜索参数: filter={filter_str}, page_size=100')

        response = requests.get(
            f'https://open.feishu.cn/open-apis/bitable/v1/apps/{bitable_app_token}/tables/{bitable_table_id}/records?filter={filter_encoded}&page_size=100',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
        )

        print(f'飞书 API 响应状态码: {response.status_code}')
        print(f'飞书 API 响应内容: {response.text}')

        if response.status_code != 200:
            error_data = response.json()
            print(f'飞书 API 错误详情: {error_data}')
            return jsonify({'error': error_data.get('msg', '搜索记录失败'), 'details': error_data}), 500

        result = response.json()
        
        if result.get('data') and result['data'].get('items') and len(result['data']['items']) > 0:
            return jsonify({'record_id': result['data']['items'][0]['record_id']})
        
        return jsonify({'record_id': None})

    except Exception as e:
        print(f'搜索飞书记录异常: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/feishu/records/all', methods=['POST'])
def get_all_feishu_records():
    try:
        data = request.json
        app_id = data.get('app_id', FEISHU_APP_ID)
        app_secret = data.get('app_secret', FEISHU_APP_SECRET)
        bitable_app_token = data.get('bitable_app_token')
        bitable_table_id = data.get('bitable_table_id')

        if not bitable_app_token or not bitable_table_id:
            return jsonify({'error': '缺少必要参数'}), 400

        if not app_id:
            return jsonify({'error': '缺少 App ID'}), 400

        access_token = get_feishu_access_token(app_id, app_secret)

        print(f'查询所有飞书记录 - URL: https://open.feishu.cn/open-apis/bitable/v1/apps/{bitable_app_token}/tables/{bitable_table_id}/records')

        response = requests.get(
            f'https://open.feishu.cn/open-apis/bitable/v1/apps/{bitable_app_token}/tables/{bitable_table_id}/records?page_size=100',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
        )

        print(f'飞书 API 响应状态码: {response.status_code}')
        print(f'飞书 API 响应内容: {response.text}')

        if response.status_code != 200:
            error_data = response.json()
            print(f'飞书 API 错误详情: {error_data}')
            return jsonify({'error': error_data.get('msg', '查询记录失败'), 'details': error_data}), 500

        return jsonify(response.json())

    except Exception as e:
        print(f'查询所有飞书记录异常: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/feishu/records', methods=['POST'])
def create_feishu_record():
    try:
        data = request.json
        app_id = data.get('app_id', FEISHU_APP_ID)
        app_secret = data.get('app_secret', FEISHU_APP_SECRET)
        bitable_app_token = data.get('bitable_app_token')
        bitable_table_id = data.get('bitable_table_id')
        fields = data.get('fields', {})

        if not bitable_app_token or not bitable_table_id:
            return jsonify({'error': '缺少必要参数'}), 400

        if not app_id:
            return jsonify({'error': '缺少 App ID'}), 400

        access_token = get_feishu_access_token(app_id, app_secret)

        print(f'创建飞书记录 - URL: https://open.feishu.cn/open-apis/bitable/v1/apps/{bitable_app_token}/tables/{bitable_table_id}/records')
        print(f'创建参数: {fields}')

        record_response = requests.post(
            f'https://open.feishu.cn/open-apis/bitable/v1/apps/{bitable_app_token}/tables/{bitable_table_id}/records',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            },
            json={'fields': fields}
        )

        print(f'飞书创建记录 API 响应状态码: {record_response.status_code}')
        print(f'飞书创建记录 API 响应内容: {record_response.text}')

        if record_response.status_code != 200:
            error_data = record_response.json()
            print(f'飞书创建记录 API 错误详情: {error_data}')
            return jsonify({'error': error_data.get('msg', '创建记录失败'), 'details': error_data}), 500

        return jsonify(record_response.json())

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/feishu/fields', methods=['POST'])
def get_feishu_fields():
    try:
        data = request.json
        app_id = data.get('app_id', FEISHU_APP_ID)
        app_secret = data.get('app_secret', FEISHU_APP_SECRET)
        bitable_app_token = data.get('bitable_app_token')
        bitable_table_id = data.get('bitable_table_id')

        if not bitable_app_token or not bitable_table_id:
            return jsonify({'error': '缺少必要参数'}), 400

        if not app_id:
            return jsonify({'error': '缺少 App ID'}), 400

        access_token = get_feishu_access_token(app_id, app_secret)

        table_response = requests.get(
            f'https://open.feishu.cn/open-apis/bitable/v1/apps/{bitable_app_token}/tables/{bitable_table_id}/fields',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
        )

        if table_response.status_code != 200:
            error_data = table_response.json()
            return jsonify({'error': error_data.get('msg', '获取字段失败'), 'details': error_data}), 500

        return jsonify(table_response.json())

    except Exception as e:
        print(f'获取飞书字段异常: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/feishu/records/<record_id>', methods=['PUT'])
def update_feishu_record(record_id):
    try:
        data = request.json
        app_id = data.get('app_id', FEISHU_APP_ID)
        app_secret = data.get('app_secret', FEISHU_APP_SECRET)
        bitable_app_token = data.get('bitable_app_token')
        bitable_table_id = data.get('bitable_table_id')
        fields = data.get('fields', {})

        if not bitable_app_token or not bitable_table_id:
            return jsonify({'error': '缺少必要参数'}), 400

        if not app_id:
            return jsonify({'error': '缺少 App ID'}), 400

        access_token = get_feishu_access_token(app_id, app_secret)

        print(f'更新飞书记录 - URL: https://open.feishu.cn/open-apis/bitable/v1/apps/{bitable_app_token}/tables/{bitable_table_id}/records/{record_id}')
        print(f'更新参数: {fields}')

        record_response = requests.put(
            f'https://open.feishu.cn/open-apis/bitable/v1/apps/{bitable_app_token}/tables/{bitable_table_id}/records/{record_id}',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            },
            json={'fields': fields}
        )

        print(f'飞书更新记录 API 响应状态码: {record_response.status_code}')
        print(f'飞书更新记录 API 响应内容: {record_response.text}')

        if record_response.status_code != 200:
            error_data = record_response.json()
            print(f'飞书更新记录 API 错误详情: {error_data}')
            return jsonify({'error': error_data.get('msg', '更新记录失败'), 'details': error_data}), 500

        return jsonify(record_response.json())

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8001))
    app.run(host='0.0.0.0', port=port, debug=True)
