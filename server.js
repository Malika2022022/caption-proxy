const express = require('express');
const https = require('https');
const app = express();

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ body: data, cookies, status: res.statusCode }));
    }).on('error', reject);
  });
}

app.get('/captions/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  if (!videoId) return res.status(400).send('No video ID');

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };

    const page = await httpsGet(`https://www.youtube.com/watch?v=${videoId}`, headers);
    const cookieHeader = page.cookies.map(c => c.split(';')[0]).join('; ');

    // Debug: check if page loaded correctly
    if (page.body.length < 1000) {
      return res.status(500).send('Page too short: ' + page.body.substring(0, 200));
    }

    // Try multiple patterns
    let captionUrl = null;

    // Pattern 1
    const m1 = page.body.match(/"baseUrl":"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/);
    if (m1) captionUrl = m1[1].replace(/\\u0026/g, '&');

    // Pattern 2
    if (!captionUrl) {
      const m2 = page.body.match(/captionTracks.*?"baseUrl":"([^"]+)"/);
      if (m2) captionUrl = m2[1].replace(/\\u0026/g, '&');
    }

    // Pattern 3 — find playerCaptionsTracklistRenderer
    if (!captionUrl) {
      const idx = page.body.indexOf('playerCaptionsTracklistRenderer');
      if (idx !== -1) {
        const chunk = page.body.substring(idx, idx + 2000);
        const m3 = chunk.match(/"baseUrl":"([^"]+)"/);
        if (m3) captionUrl = m3[1].replace(/\\u0026/g, '&');
      }
    }

    if (!captionUrl) {
      // Show what we got for debugging
      const idx = page.body.indexOf('captionTracks');
      const preview = idx !== -1 ? page.body.substring(idx, idx + 300) : 'captionTracks not found in page';
      return res.status(404).send('No caption URL found. Debug: ' + preview);
    }

    const captions = await httpsGet(`${captionUrl}&fmt=json3`, {
      ...headers,
      'Cookie': cookieHeader,
      'Referer': 'https://www.youtube.com/',
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.send(captions.body);

  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
});

app.listen(process.env.PORT || 3000);
console.log('Server running on port 3000');