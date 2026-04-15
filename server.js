const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const app = express();

app.get('/captions/:videoId', (req, res) => {
  const videoId = req.params.videoId;
  const lang = req.query.lang || 'en';
  res.setHeader('Access-Control-Allow-Origin', '*');

  execFile('yt-dlp', [
    '--write-sub',
    '--write-auto-sub', 
    '--sub-lang', lang,
    '--skip-download',
    '--sub-format', 'json3',
    '-o', `/tmp/${videoId}.%(ext)s`,
    `https://www.youtube.com/watch?v=${videoId}`
  ], (err, stdout, stderr) => {
    console.log('stderr:', stderr);
    if (err) return res.status(500).send('Error: ' + stderr);

    const files = fs.readdirSync('/tmp').filter(f => f.startsWith(videoId));
    if (files.length === 0) return res.status(404).send('No captions found');

    const data = fs.readFileSync(`/tmp/${files[0]}`, 'utf8');
    files.forEach(f => { try { fs.unlinkSync(`/tmp/${f}`); } catch(e) {} });
    res.send(data);
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT);
console.log('Server running on port', PORT);