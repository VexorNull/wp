export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const GITHUB_TOKEN = process.env.GH_TOKEN;
  
  // Debugging ke liye check
  if (!GITHUB_TOKEN) {
    console.error("CRITICAL: GH_TOKEN environment variable is undefined.");
    return res.status(500).json({ 
      message: 'GH_TOKEN is missing in Vercel settings. Please ensure it is added to Production environment and redeployed.' 
    });
  }

  const REPO_OWNER = 'vexornull';
  const REPO_NAME = 'wp';
  const FILE_PATH = 'Received.txt';

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

  try {
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

    const timestamp = new Date().toISOString();
    const newEntry = `\n========================================\nDATE: ${timestamp}\nNAME: ${name}\nEMAIL: ${email}\nMESSAGE: ${message}\n========================================\n`;
    
    const updatedContent = currentContent + newEntry;
    const base64Content = Buffer.from(updatedContent).toString('base64');

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
      return res.status(500).json({ message: 'Failed to update Received.txt: ' + (errorData.message || 'Unknown error') });
    }
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ message: 'Internal Server Error: ' + err.message });
  }
}
