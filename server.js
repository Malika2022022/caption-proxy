const express = require('express');
const { exec } = require('child_process');
const app = express();

app.get('/captions/:videoId', (req, res) => {
  const videoId = req.params.videoId;
  const lang = req.query.lang || 'en';

  res.setHeader('Access-Control-Allow-Origin', '*');

  exec(
    `yt-dlp --write-sub --write-auto-sub --sub-lang ${lang} --skip-download --sub-format json3 -o /tmp/%(id)s.%(ext)s "https://www.youtube.com/watch?v=${videoId}"`,
    (err, stdout, stderr) => {
      console.log('stdout:', stdout);
      console.log('stderr:', stderr);

      if (err) {
        return res.status(500).send('yt-dlp error: ' + stderr);
      }

      const fs = require('fs');
      const path = `/tmp/${videoId}.${lang}.json3`;
      const altPath = `/tmp/${videoId}.${lang}-orig.json3`;

      let filePath = null;
      if (fs.existsSync(path)) filePath = path;
      else if (fs.existsSync(altPath)) filePath = altPath;
      else {
        // Find any matching file
        const files = fs.readdirSync('/tmp').filter(f => f.startsWith(videoId));
        console.log('Files in /tmp:', files);
        if (files.length > 0) filePath = `/tmp/${files[0]}`;
      }

      if (!filePath) {
        return res.status(404).send('No caption file found. Files: ' + 
          fs.readdirSync('/tmp').filter(f => f.startsWith(videoId)).join(', '));
      }

      const data = fs.readFileSync(filePath, 'utf8');
      fs.unlinkSync(filePath);
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    }
  );
});

app.get('/tracks/:videoId', (req, res) => {
  const videoId = req.params.videoId;
  res.setHeader('Access-Control-Allow-Origin', '*');

  exec(
    `yt-dlp --list-subs "https://www.youtube.com/watch?v=${videoId}"`,
    (err, stdout, stderr) => {
      if (err) return res.status(500).send('Error: ' + stderr);
      res.send(stdout);
    }
  );
});

const PORT = process.env.PORT || 8080;
app.listen(PORT);
console.log('Server running on port', PORT);