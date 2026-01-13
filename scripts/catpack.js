import { doJob } from './catpackjs/utils/WorkerUtils.js';

const fileNameBox = document.getElementById('pack-name');
const packTypeBox = document.getElementById('pack-type');
const convertedTypeBox = document.getElementById('converted-type');
const statsBox = document.getElementById('form');
const processingBox = document.getElementById('processing');

const downloader = document.createElement('a');

async function saveFile(name, content) {
  const blob = new Blob([content.buffer], { type: 'binary/plain' });
  const url = URL.createObjectURL(blob);
  downloader.href = url;
  downloader.download = name;
  downloader.click();
  URL.revokeObjectURL(url);
}

async function process(file) {
  processingBox.style.display = 'flex';
  statsBox.style.display = 'none';

  fileNameBox.textContent = file.name;

  const { output, outputFileName, packType, convertedType } = await doJob('do work silly', { file });

  packTypeBox.textContent = packType;
  convertedTypeBox.textContent = convertedType;

  const submit = document.getElementById('submit');
  const newSubmit = submit.cloneNode(true);
  submit.parentNode.replaceChild(newSubmit, submit);

  newSubmit.addEventListener('click', () => {
    saveFile(outputFileName, output);
  });

  processingBox.style.display = 'none';
  statsBox.style.display = 'flex';
}


document.getElementById('file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (file) {
    await process(file);
  }
});

document.body.addEventListener('dragenter', event => event.preventDefault());
document.body.addEventListener('dragover', event => event.preventDefault());

document.body.addEventListener('drop', async event => {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file) {
    await process(file);
  }
});
