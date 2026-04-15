import express from 'express';
import YoutubeTranscript from 'youtube-transcript';

const app = express();

app.get('/captions/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  const lang = req.query.lang || 'en';
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang });
    res.json(transcript);
  } catch(e) {
    res.status(500).send('Error: ' + e.message);
  }
});

app.get('/tracks/:videoId', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json([{ lang: 'en', name: 'English' }]);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT);
console.log('Server running on port', PORT);