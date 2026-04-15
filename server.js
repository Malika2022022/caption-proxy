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

    // Step 1: fetch YouTube page server-side
    const page = await httpsGet(`https://www.youtube.com/watch?v=${videoId}`, headers);
    
    const cookieHeader = page.cookies.map(c => c.split(';')[0]).join('; ');

    // Step 2: extract caption URL from page
    const match = page.body.match(/"captionTracks":\[.*?"baseUrl":"([^"]+)"/);
    if (!match) return res.status(404).send('No captions found');

    const captionUrl = match[1].replace(/\\u0026/g, '&');

    // Step 3: fetch captions with same session cookies
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