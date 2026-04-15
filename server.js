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

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// Get available tracks for a video
app.get('/tracks/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  try {
    const page = await httpsGet(`https://www.youtube.com/watch?v=${videoId}`, headers);

    const idx = page.body.indexOf('captionTracks');
    if (idx === -1) return res.status(404).send('No captions');

    const chunk = page.body.substring(idx, idx + 50000);
    const trackRegex = /"baseUrl":"([^"]+)"[^}]*?"languageCode":"([^"]+)"[^}]*?"simpleText":"([^"]+)"/g;
    
    let match;
    const tracks = [];
    while ((match = trackRegex.exec(chunk)) !== null) {
      tracks.push({
        url: match[1].replace(/\\u0026/g, '&'),
        lang: match[2],
        name: match[3]
      });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(tracks);
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
});

// Get captions for a specific language
app.get('/captions/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  const lang = req.query.lang || 'en';
  
  try {
    const page = await httpsGet(`https://www.youtube.com/watch?v=${videoId}`, headers);
    const cookieHeader = page.cookies.map(c => c.split(';')[0]).join('; ');

    const idx = page.body.indexOf('captionTracks');
    if (idx === -1) return res.status(404).send('No captionTracks');

    const chunk = page.body.substring(idx, idx + 50000);
    const trackRegex = /"baseUrl":"([^"]+)"[^}]*?"languageCode":"([^"]+)"/g;
    
    let match;
    let selectedUrl = null;
    let firstUrl = null;

    while ((match = trackRegex.exec(chunk)) !== null) {
      const url = match[1].replace(/\\u0026/g, '&');
      const trackLang = match[2];
      if (!firstUrl) firstUrl = url;
      if (trackLang === lang) {
        selectedUrl = url;
        break;
      }
    }

    const captionUrl = selectedUrl || firstUrl;
    if (!captionUrl) return res.status(404).send('No caption URL found');

    const captions = await httpsGet(`${captionUrl}&fmt=json3`, {
      ...headers,
      'Cookie': cookieHeader,
      'Referer': `https://www.youtube.com/watch?v=${videoId}`,
      'Origin': 'https://www.youtube.com',
    });

    if (captions.body.length === 0) {
      return res.status(500).send('Empty response');
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.send(captions.body);

  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
});

app.listen(process.env.PORT || 3000);
console.log('Server running on port 3000');