const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
// Line wrapping for the share images, with a fake canvas that gives every character the same width.
const ShareImage=require('./share-image.js'),g={measureText:s=>({width:[...s].length*10})};
test('share-image wrapping keeps closing marks off the line start and ends overflow with …',()=>{
 assert.deepEqual(ShareImage.wrap(g,'あいうえお、かきくけこ',50),['あいうえお、','かきくけこ']);
 let lines=ShareImage.wrap(g,'あ'.repeat(30),50,2);assert.equal(lines.length,2);assert.ok(lines[1].endsWith('…'));assert.ok(lines[1].length<=5)});
test('notice and pair cards offer a URL and an image, not the old text copy',()=>{const app=fs.readFileSync('map-preview/app.js','utf8'),html=fs.readFileSync('map-preview/index.html','utf8');
 assert.match(app,/url\.textContent='URLをコピー'/);assert.match(app,/img\.hidden=false/);assert.match(html,/id="pcards-img"/);assert.match(fs.readFileSync('map-preview/build.mjs','utf8'),/'share-image\.js'/)});
