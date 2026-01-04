from http.server import BaseHTTPRequestHandler
import json
import os
import requests

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        app_id = data.get('app_id', os.environ.get('FEISHU_APP_ID', ''))
        app_secret = data.get('app_secret', os.environ.get('FEISHU_APP_SECRET', ''))
        
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
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'access_token': access_token}).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
