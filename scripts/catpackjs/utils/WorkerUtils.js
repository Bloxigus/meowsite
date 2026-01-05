const packConverterWorker = new Worker('scripts/catpackjs/worker/worker.js', { type: 'module' });

const workPromises = new Map();

packConverterWorker.addEventListener('message', (event) => {
  const data = event.data;
  if (workPromises.has(data.type)) {
    workPromises.get(data.type)(data);
  }
});

export function doJob(type, data) {
  packConverterWorker.postMessage({
    'type': type,
    ...data
  });

  return new Promise(resolve => {
    workPromises.set(type, resolve);
  });
}
