const express = require('express');
const { execFile } = require('child_process');
const app = express();

app.get('/captions/:videoId', (req, res) => {
  const videoId = req.params.videoId;
  const lang = req.query.lang || 'en';
  res.setHeader('Access-Control-Allow-Origin', '*');

  const script = `
from youtube_transcript_api import YouTubeTranscriptApi
import json
transcript = YouTubeTranscriptApi.get_transcript('${videoId}', languages=['${lang}'])
print(json.dumps(transcript))
`;

  execFile('python3', ['-c', script], (err, stdout, stderr) => {
    console.log('stderr:', stderr);
    if (err) return res.status(500).send('Error: ' + stderr);
    res.setHeader('Content-Type', 'application/json');
    res.send(stdout);
  });
});

app.get('/tracks/:videoId', (req, res) => {
  const videoId = req.params.videoId;
  res.setHeader('Access-Control-Allow-Origin', '*');

  const script = `
from youtube_transcript_api import YouTubeTranscriptApi
import json
transcript_list = YouTubeTranscriptApi.list_transcripts('${videoId}')
tracks = [{'lang': t.language_code, 'name': t.language, 'isAuto': t.is_generated} for t in transcript_list]
print(json.dumps(tracks))
`;

  execFile('python3', ['-c', script], (err, stdout, stderr) => {
    if (err) return res.status(500).send('Error: ' + stderr);
    res.setHeader('Content-Type', 'application/json');
    res.send(stdout);
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT);
console.log('Server running on port', PORT);