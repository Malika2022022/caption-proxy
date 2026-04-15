const express = require('express');
const https = require('https');
const app = express();
const agent = new https.Agent({ keepAlive: true });

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers, agent }, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ body: data, cookies, status: res.statusCode }));
    }).on('error', reject);
  });
}
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cookie': 'CONSENT=YES+cb; YSC=DwKYllHNwuw; VISITOR_INFO1_LIVE=oKckVLH0M4E',
};

app.get('/raw/:videoId', async (req, res) => {
  const page = await httpsGet(
    `https://www.youtube.com/watch?v=${req.params.videoId}`,
    headers
  );
  res.json({
    size: page.body.length,
    hasCaption: page.body.includes('captionTracks'),
    hasConsent: page.body.includes('consent'),
    hasBot: page.body.includes('detected unusual'),
    preview: page.body.substring(0, 300)
  });
});

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
    const rawUrl = track.baseUrl;
    const captionUrl = (rawUrl.startsWith('http') ? rawUrl : 'https://www.youtube.com' + rawUrl) + '&fmt=json3';
    const captions = await httpsGet(captionUrl, {
      ...headers,
      'Cookie': cookieHeader + '; CONSENT=YES+cb',
      'Referer': `https://www.youtube.com/watch?v=${videoId}`,
      'Origin': 'https://www.youtube.com',
    });

    console.log('Caption status:', captions.status);
    console.log('Caption size:', captions.body.length);
    console.log('Caption preview:', captions.body.substring(0, 200));
    if (captions.body.length === 0) {
      return res.status(500).send(JSON.stringify({
        empty: true,
        url: captionUrl.substring(0, 200),
        status: captions.status,
      }));
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