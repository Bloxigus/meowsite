import { processFile } from './packConvertJob.js';

const jobTypes = {
  'do work silly': processFile
};

onmessage = async function(event) {
  const data = event.data;
  const type = data.type;
  const fun = jobTypes[type];
  if (fun !== undefined) {

    const responseData = await fun(data);

    postMessage({
      type,
      ...responseData
    });
  }
};
