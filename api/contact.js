export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Vercel Environment Variable se secure access
  const GITHUB_TOKEN = process.env.GH_TOKEN;
  const REPO_OWNER = 'vexornull';
  const REPO_NAME = 'wp';
  const FILE_PATH = 'Received.txt';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ message: 'GH_TOKEN is missing in Vercel settings' });
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

  try {
    // 1. Existing Received.txt file content aur SHA check karein
    const getFileResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    let currentContent = '';
    let fileSha = '';

    if (getFileResponse.ok) {
      const fileData = await getFileResponse.json();
      fileSha = fileData.sha;
      currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
    }

    // 2. New message format karein
    const timestamp = new Date().toISOString();
    const newEntry = `\n========================================\nDATE: ${timestamp}\nNAME: ${name}\nEMAIL: ${email}\nMESSAGE: ${message}\n========================================\n`;
    
    const updatedContent = currentContent + newEntry;
    const base64Content = Buffer.from(updatedContent).toString('base64');

    // 3. GitHub API ke zariye Received.txt mein data write karein
    const updateResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `New transmission logged from ${name}`,
        content: base64Content,
        sha: fileSha || undefined,
      }),
    });

    if (updateResponse.ok) {
      return res.status(200).json({ success: true, message: 'Transmission logged successfully' });
    } else {
      const errorData = await updateResponse.json();
      console.error('GitHub API Error:', errorData);
      return res.status(500).json({ message: 'Failed to update Received.txt' });
    }
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
