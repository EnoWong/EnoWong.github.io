/* ========= 全局配置 ========= */
const API = 'https://api.convertx.tld/v1/convert';   // 公共实例，免费 100 次/天
const MAX_PARALLEL = 5;                              // 并发限制，防卡

/* ========= 工具函数 ========= */
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ========= 拖拽上传 ========= */
['dragenter', 'dragover'].forEach(evt =>
  document.addEventListener(evt, e => e.preventDefault()));
document.addEventListener('drop', async e => {
  e.preventDefault();
  const files = [...e.dataTransfer.files];
  if (!files.length) return;
  await batchConvert(files);
});

/* ========= 转换逻辑 ========= */
async function batchConvert(files) {
  const btn = $('convertDocument');
  btn.disabled = true;
  btn.textContent = '转换中…';
  const zip = new JSZip();            // 引入 zip.js CDN 即可
  let done = 0;

  /* 并发控制 */
  async function run(file) {
    const form = new FormData();
    form.append('file', file);
    form.append('to', getTargetFormat());   // 从页面读取
    const res = await fetch(API, {method:'POST', body: form});
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    zip.file(file.name.replace(/\.\w+$/, '') + '.' + getTargetFormat(), blob);
    done++;
    $('progress-fill').style.width = (done/files.length*100) + '%';
  }
  const queue = [...files];
  const workers = Array.from({length: Math.min(MAX_PARALLEL, queue.length)}, async () => {
    while (queue.length) await run(queue.shift());
  });
  await Promise.all(workers);

  /* 打包下载 */
  const blobZip = await zip.generateAsync({type:'blob'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blobZip);
  a.download = 'converted.zip';
  a.click();
  btn.disabled = false;
  btn.textContent = '开始转换';
}

/* ========= 辅助 ========= */
function getTargetFormat() {
  return document.querySelector('.format-btn.selected').dataset.format;
}

/* ========= CDN：zip.js ========= */
const s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
document.head.appendChild(s);