# 重构项目为 Vite + Node.js 架构

## 1. 初始化 Vite 项目
- 创建 `package.json`，配置 Vite 依赖和脚本
- 创建 `vite.config.js` 配置代理（用于本地开发）

## 2. 迁移前端代码
- 将 `index.html` 移回根目录，并更新为 ESM 引用方式
- 将 `app.js` 移回根目录（或 `src/`），确保代码兼容性
- 将 `favicon.svg` 放入 `public/` 目录

## 3. 重写后端 API (Python -> Node.js)
将原有的 Python Serverless Functions 重写为 Vercel 支持的标准 Node.js Serverless Functions，使用原生 `fetch` API：
- `api/config.js`: 读取环境变量并返回配置
- `api/feishu/access_token.js`: 获取飞书 tenant_access_token
- `api/feishu/records/search.js`: 搜索多维表格记录
- `api/feishu/records/index.js`: 创建新记录
- `api/feishu/records/[record_id].js`: 更新现有记录

## 4. 配置与部署
- 创建 `.gitignore`
- 移除旧的 `vercel.json`（Vite + API 为 Vercel 默认支持架构，无需额外配置）
- 提交代码触发 Vercel 自动部署
