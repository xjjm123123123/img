from http.server import BaseHTTPRequestHandler
import json
import os
import requests
from urllib.parse import quote

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        app_id = data.get('app_id', os.environ.get('FEISHU_APP_ID', ''))
        app_secret = data.get('app_secret', os.environ.get('FEISHU_APP_SECRET', ''))
        bitable_app_token = data.get('bitable_app_token')
        bitable_table_id = data.get('bitable_table_id')
        name_field_name = data.get('name_field_name', 'name')
        activity_name = data.get('activity_name')
        
        if not bitable_app_token or not bitable_table_id or not activity_name:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': '缺少必要参数'}).encode())
            return
        
        if not app_id:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': '缺少 App ID'}).encode())
            return
        
        try:
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
            
            filter_obj = {
                'conjunction': 'and',
                'conditions': [{
                    'field_name': name_field_name,
                    'operator': 'is',
                    'value': [activity_name]
                }]
            }
            
            filter_str = json.dumps(filter_obj, ensure_ascii=False)
            filter_encoded = quote(filter_str)
            
            response = requests.get(
                f'https://open.feishu.cn/open-apis/bitable/v1/apps/{bitable_app_token}/tables/{bitable_table_id}/records?filter={filter_encoded}&page_size=100',
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise Exception(error_data.get('msg', '搜索记录失败'))
            
            result = response.json()
            
            if result.get('data') and result['data'].get('items') and len(result['data']['items']) > 0:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'record_id': result['data']['items'][0]['record_id']}).encode())
            else:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'record_id': None}).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
