import os
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        config = {
            'github': {
                'owner': os.environ.get('GITHUB_OWNER', ''),
                'repo': os.environ.get('GITHUB_REPO', ''),
                'token': os.environ.get('GITHUB_TOKEN', ''),
                'branch': os.environ.get('GITHUB_BRANCH', 'main')
            },
            'feishu': {
                'app_id': os.environ.get('FEISHU_APP_ID', ''),
                'app_secret': os.environ.get('FEISHU_APP_SECRET', ''),
                'bitable_app_token': os.environ.get('FEISHU_BITABLE_APP_TOKEN', ''),
                'bitable_table_id': os.environ.get('FEISHU_BITABLE_TABLE_ID', '')
            },
            'field_names': {
                'imgurl1': 'imgurl1',
                'imgurl2': 'imgurl2',
                'imgurl3': 'imgurl3',
                'name': 'name'
            }
        }
        
        import json
        self.wfile.write(json.dumps(config).encode())
        return