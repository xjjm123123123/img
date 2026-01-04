module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const { file_name, file_content, path } = body;

    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER || '';
    const githubRepo = process.env.GITHUB_REPO || '';
    const githubBranch = process.env.GITHUB_BRANCH || 'main';

    if (!githubToken) {
      return res.status(500).json({ error: 'GitHub token not configured' });
    }

    if (!githubOwner || !githubRepo) {
      return res.status(500).json({ error: 'GitHub repository not configured' });
    }

    if (!file_name || !file_content) {
      return res.status(400).json({ error: 'Missing file_name or file_content' });
    }

    let sha = null;

    try {
      const checkResponse = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        sha = checkData.sha;
      }
    } catch (checkError) {
      console.log('File does not exist, will create new file');
    }

    const requestBody = {
      message: `Upload image: ${file_name}`,
      content: file_content,
      branch: githubBranch
    };

    if (sha) {
      requestBody.sha = sha;
    }

    const response = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API Error:', response.status, errorText);
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || 'Upload to GitHub failed');
      } catch (parseError) {
        throw new Error(`Upload to GitHub failed: ${errorText}`);
      }
    }

    const data = await response.json();
    res.status(200).json({ download_url: data.content.download_url });

  } catch (error) {
    console.error('GitHub upload error:', error);
    res.status(500).json({ error: error.message });
  }
};