# 图片批量上传插件

一个简单易用的图片批量上传工具，可以将图片上传到 GitHub 仓库，并根据活动名称将链接写入飞书多维表格。

## 功能特性

- 支持批量上传最多 3 张图片
- 自动将图片上传到 GitHub 仓库
- 自动生成图片链接
- 根据活动名称智能处理飞书多维表格记录：
  - 如果活动名称已存在，更新现有记录的 imgurl1, imgurl2, imgurl3 字段
  - 如果活动名称不存在，创建新记录
- 活动名称自动作为 GitHub 图片文件夹名称
- 美观的拖拽上传界面
- 本地存储配置信息

## 使用方法

### 1. 配置 GitHub

在使用前，需要先配置 GitHub 相关信息：

- **仓库所有者**: GitHub 用户名或组织名（默认: xjjm123123123）
- **仓库名称**: 目标仓库名称（默认: img）
- **GitHub Token**: GitHub Personal Access Token（需要 `repo` 权限）
- **分支名称**: 目标分支（默认为 main）

#### 如何获取 GitHub Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" -> "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 生成并复制 token

### 2. 配置飞书多维表格

如果需要将图片链接写入飞书多维表格，请配置以下信息：

- **活动名称**: 输入活动名称，将作为文件夹名称和飞书记录的 name 字段值
- **名称字段**: 飞书多维表格中存储活动名称的字段名（默认为 name）
- **App ID**: 飞书应用的 App ID（在飞书开放平台获取）
- **App Secret**: 飞书应用的 App Secret
- **多维表格 App Token**: 飞书多维表格的 App Token
- **表格 ID**: 目标表格的 ID
- **字段名称**: 三个独立字段名（默认为 imgurl1, imgurl2, imgurl3）

#### 如何获取飞书应用信息

1. 访问飞书开放平台：https://open.feishu.cn/
2. 创建应用并获取 App ID 和 App Secret
3. 在应用权限中添加 "多维表格:表格" 权限
4. 获取多维表格的 App Token 和表格 ID

### 3. 上传图片

1. 输入活动名称（必填）
2. 点击上传区域或拖拽图片到上传区域
3. 预览已选择的图片
4. 点击"开始上传"按钮
5. 等待上传完成

## 工作流程

1. **输入活动名称**：用户输入活动名称，如"2024年会"
2. **上传图片**：选择最多 3 张图片
3. **上传到 GitHub**：图片会自动上传到 GitHub 仓库的 `images/{活动名称}/` 目录下
4. **搜索飞书记录**：系统会在飞书多维表格中搜索 name 字段等于活动名称的记录
5. **更新或创建记录**：
   - 如果找到记录：更新该记录的 imgurl1, imgurl2, imgurl3 字段
   - 如果未找到记录：创建新记录，并设置 name 字段和 imgurl1, imgurl2, imgurl3 字段

## 项目结构

```
img/
├── index.html      # 主页面
├── app.js          # 核心逻辑
├── config.json     # 配置文件示例
├── feishu-config.json  # 飞书配置示例
├── server.py       # Flask 后端服务器（可选）
├── package.json    # 项目配置
└── README.md       # 说明文档
```

## 本地运行

1. 安装依赖（如果需要）：
```bash
npm install
```

2. 启动本地服务器：
```bash
npm start
```

3. 在浏览器中访问：http://localhost:8000

## API 说明

### GitHub API

插件使用 GitHub REST API 上传图片：
- 端点：`PUT /repos/{owner}/{repo}/contents/{path}`
- 需要 `repo` 权限的 Personal Access Token
- 图片路径格式：`images/{活动名称}/{时间戳}_{文件名}`

### 飞书多维表格 API

插件支持将图片链接写入飞书多维表格的三个独立字段：

#### 搜索记录
- 端点：`POST /open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/search`
- 根据名称字段搜索现有记录

#### 创建记录
- 端点：`POST /open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records`
- 创建新记录，包含 name 和 imgurl1, imgurl2, imgurl3 字段

#### 更新记录
- 端点：`PUT /open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}`
- 更新现有记录的 imgurl1, imgurl2, imgurl3 字段

## 注意事项

1. GitHub Token 和飞书 App Secret 需要妥善保管，不要泄露
2. 上传的图片会保存在 GitHub 仓库的 `images/{活动名称}/` 目录下
3. 每次上传最多支持 3 张图片
4. 配置信息会保存在浏览器的 localStorage 中
5. 飞书 API 需要正确的 App ID 和 App Secret 才能正常工作
6. 活动名称是必填项，用于确定 GitHub 文件夹路径和飞书记录匹配
7. 如果活动名称已存在于飞书表格中，会更新现有记录而不是创建新记录

## 许可证

MIT License
