const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');
const multiparty = require('multiparty');
const fse = require('fs-extra');
const { resolve } = require('path');

const app = express();
const server = http.createServer();
const UPLOAD_DIR = path.resolve(__dirname, '..', 'dist');

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
})

server.on('request', async (req, res) => {
  if (req.url === '/') {
    const html = fs.readFileSync(__dirname + '/views/index.html');
    res.end(html);
  }

  if (req.url === '/file/upload') {
    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
      // console.log('files', files);
      const [hash] = fields.hash;
      const [filename] = fields.filename;
      const [file] = files.chunk;
      const name = filename.split('.')[0];

      const fileDir = path.join(UPLOAD_DIR, name, '/');
      console.log('fileDir', fileDir);

      if (!fse.existsSync(fileDir)) {
        fse.mkdirSync(fileDir);
      }
      const src = file.path;
      const dist = path.resolve(fileDir, `${filename}-${hash}`);
      saveFile(src, dist, res);
    });
  }

  if (req.url === '/file/merge') {
    const data = await getPostData(req);
    const { filename } = data;
    const name = filename.split('.')[0];
    const targeDir = path.join(UPLOAD_DIR, name);

    
    if (!fse.existsSync(targeDir)) {
      res.end('400');
      return;
    }
    try {
      const chunks = fse.readdirSync(targeDir);
      console.log('chunks', chunks);
      const targeFile = path.join(UPLOAD_DIR, filename);
      fse.writeFileSync(targeFile, '');
      mergeFile(targeFile, targeDir, chunks);
      res.end('200');

    } catch (e) {
      console.error(e);
      res.end('500');
    }
  }
})

async function mergeFile(targetFile, targetDir, chunks) {
  for (let i = 1; i <= chunks.length; i++) {
    const filename = path.basename(targetFile);
    const chunkPath = path.join(targetDir, '/', filename + '-' +  i);
    console.log('chunkPath', chunkPath);

    const sourceFile = fse.readFileSync(chunkPath);
    fse.appendFileSync(targetFile, sourceFile);
    fse.unlinkSync(chunkPath);
  }
  fse.rmdirSync(targetDir);
}

async function saveFile(src, dist, res) {
  try {
    await fse.move(src, dist);
    res.end('200');
  } catch (e) {
    console.error(e);
    res.end('201');
  }
}

const getPostData = (req) => {
  const data = [];
  return new Promise((resolve) => {
    req.on('data', (chunk) => {
      data.push(chunk);
    });
    req.on('end', () => {
      const body = Buffer.concat(data);
      // console.log('type', typeof body);
      resolve(JSON.parse(body));
    })
  });
}

server.listen(3000);