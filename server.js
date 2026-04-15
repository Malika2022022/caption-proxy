const express = require('express');
const https = require('https');
const app = express();

app.get('/captions', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('No URL');
  
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.youtube.com/',
      'Origin': 'https://www.youtube.com',
    }
  };

  https.get(url, options, (response) => {
    let data = '';
    res.setHeader('Access-Control-Allow-Origin', '*');
    response.on('data', chunk => data += chunk);
    response.on('end', () => res.send(data));
  }).on('error', (e) => res.status(500).send('Error: ' + e.message));
});

app.listen(process.env.PORT || 3000);
console.log('Server running on port 3000');