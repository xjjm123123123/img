module.exports = async function handler(req, res) {
  const config = {
    github: {
      owner: process.env.GITHUB_OWNER || '',
      repo: process.env.GITHUB_REPO || '',
      token: process.env.GITHUB_TOKEN || '',
      branch: process.env.GITHUB_BRANCH || 'main'
    },
    feishu: {
      app_id: process.env.FEISHU_APP_ID || '',
      app_secret: process.env.FEISHU_APP_SECRET || '',
      bitable_app_token: process.env.FEISHU_BITABLE_APP_TOKEN || '',
      bitable_table_id: process.env.FEISHU_BITABLE_TABLE_ID || ''
    },
    field_names: {
      imgurl1: 'imgurl1',
      imgurl2: 'imgurl2',
      imgurl3: 'imgurl3',
      name: 'name'
    }
  };

  res.status(200).json(config);
};
