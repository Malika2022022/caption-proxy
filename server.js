const express = require('express');
const { EnhancedYouTubeTranscriptApi } = require('@playzone/youtube-transcript');
const app = express();

const api = new EnhancedYouTubeTranscriptApi({}, {
  enabled: true,
  instanceUrls: [
    'https://yewtu.be',
    'https://invidious.snopyta.org',
    'https://vid.puffyan.us'
  ]
});

app.get('/captions/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  const lang = req.query.lang || 'en';
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const transcript = await api.fetch(videoId, { languages: [lang, 'en'] });
    res.json(transcript);
  } catch(e) {
    res.status(500).send('Error: ' + e.message);
  }
});

app.get('/tracks/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const list = await api.list(videoId);
    res.json(list);
  } catch(e) {
    res.status(500).send('Error: ' + e.message);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT);
console.log('Server running on port', PORT);