const express = require('express');
const { execFile } = require('child_process');
const app = express();

app.get('/captions/:videoId', (req, res) => {
  const videoId = req.params.videoId;
  const lang = req.query.lang || 'en';
  res.setHeader('Access-Control-Allow-Origin', '*');

  execFile('python3', ['-c', `
from youtube_transcript_api import YouTubeTranscriptApi
import json
data = YouTubeTranscriptApi.get_transcript('${videoId}', languages=['${lang}'])
print(json.dumps(data))
`], (err, stdout, stderr) => {
    if (err) return res.status(500).send('Error: ' + stderr);
    res.setHeader('Content-Type', 'application/json');
    res.send(stdout);
  });
});

app.get('/tracks/:videoId', (req, res) => {
  const videoId = req.params.videoId;
  res.setHeader('Access-Control-Allow-Origin', '*');

  execFile('python3', ['-c', `
from youtube_transcript_api import YouTubeTranscriptApi
import json
tlist = YouTubeTranscriptApi.list_transcripts('${videoId}')
result = [{'lang': t.language_code, 'name': t.language, 'isAuto': t.is_generated} for t in tlist]
print(json.dumps(result))
`], (err, stdout, stderr) => {
    if (err) return res.status(500).send('Error: ' + stderr);
    res.setHeader('Content-Type', 'application/json');
    res.send(stdout);
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT);
console.log('Server running on port', PORT);