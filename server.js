import express from 'express';
import { execFile } from 'child_process';

const app = express();

const PROXY_USER = 'fzytktuv';
const PROXY_PASS = 'obm06om4uar4';

app.get('/captions/:videoId', (req, res) => {
  const videoId = req.params.videoId;
  const lang = req.query.lang || 'en';
  res.setHeader('Access-Control-Allow-Origin', '*');

  execFile('python3', ['-c', `
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig
import json
api = YouTubeTranscriptApi(proxy_config=WebshareProxyConfig(
    proxy_username="${PROXY_USER}",
    proxy_password="${PROXY_PASS}"
))
result = api.fetch("${videoId}", languages=["${lang}", "en"])
print(json.dumps([{"text": s.text, "start": s.start, "duration": s.duration} for s in result]))
`], (err, stdout, stderr) => {
    console.log('stderr:', stderr);
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
from youtube_transcript_api.proxies import WebshareProxyConfig
import json
api = YouTubeTranscriptApi(proxy_config=WebshareProxyConfig(
    proxy_username="${PROXY_USER}",
    proxy_password="${PROXY_PASS}"
))
tlist = api.list("${videoId}")
result = [{"lang": t.language_code, "name": t.language, "isAuto": t.is_generated} for t in tlist]
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