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

app.get('/tracks/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  try {
    const page = await httpsGet(`https://www.youtube.com/watch?v=${videoId}`, headers);
    const idx = page.body.indexOf('captionTracks');
    if (idx === -1) return res.status(404).send('No captions');
    const chunk = page.body.substring(idx, idx + 50000);
    const tracksMatch = chunk.match(/captionTracks":([\s\S]*?\])/);
    if (!tracksMatch) return res.status(404).send('Cannot parse');
    const tracks = JSON.parse(tracksMatch[1]);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(tracks.map(t => ({
      lang: t.languageCode,
      name: t.name?.simpleText,
      isAuto: t.kind === 'asr'
    })));
  } catch(e) {
    res.status(500).send('Error: ' + e.message);
  }
});

app.get('/captions/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  const lang = req.query.lang || 'en';
  try {
    const page = await httpsGet(`https://www.youtube.com/watch?v=${videoId}`, headers);
    const cookieHeader = page.cookies.map(c => c.split(';')[0]).join('; ');
    const idx = page.body.indexOf('captionTracks');
    if (idx === -1) return res.status(404).send('No captionTracks');
    const chunk = page.body.substring(idx, idx + 50000);
    const tracksMatch = chunk.match(/captionTracks":([\s\S]*?\])/);
    if (!tracksMatch) return res.status(404).send('Cannot parse tracks');
    const tracks = JSON.parse(tracksMatch[1]);
    const track = tracks.find(t => t.languageCode === lang) || tracks[0];
    if (!track) return res.status(404).send('No track found');
    const captionUrl = track.baseUrl + '&fmt=json3';
    const captions = await httpsGet(captionUrl, {
      ...headers,
      'Cookie': cookieHeader,
      'Referer': `https://www.youtube.com/watch?v=${videoId}`,
      'Origin': 'https://www.youtube.com',
    });
    if (captions.body.length === 0) {
      return res.status(500).send('Empty — URL: ' + captionUrl.substring(0, 150));
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.send(captions.body);
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
});

app.get('/raw/:videoId', async (req, res) => {
  const page = await httpsGet(`https://www.youtube.com/watch?v=${req.params.videoId}`, headers);
  const idx = page.body.indexOf('captionTracks');
  if (idx === -1) return res.send('captionTracks NOT FOUND');
  res.send(page.body.substring(idx, idx + 1000));
});

app.listen(process.env.PORT || 3000);