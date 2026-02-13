import { ZipArchive } from '../archives/ZipArchive.js';
import { CatArchive } from '../archives/CatArchive.js';
import { ReadableBuffer } from '../utils/ReadableBuffer.js';
import { PleadError } from '../utils/Utils.js';


const catsZipPattern = /\.cats\.zip$/;
const zipPattern = /\.zip$/;
const catsPattern = /\.cats$/;

export async function processFile({ file }) {
  const name = file.name;
  const content = ReadableBuffer.from(await file.arrayBuffer());

  let output;
  let outputFileName;
  let packType;
  let convertedType;

  if (catsZipPattern.test(name)) {
    output = await handleCatsZipFile(content)
    outputFileName = name.replace(catsZipPattern, '.zip')
    packType = 'Catharsis Resource Pack';
    convertedType = 'Vanilla Resource Pack';
  } if (catsPattern.test(name)) {
    output = await handleCatsFile(content);
    outputFileName = name.replace(catsPattern, '.zip');
    packType = 'Catharsis Resource Pack';
    convertedType = 'Vanilla Resource Pack';
  } else if (zipPattern.test(name)) {
    output = await handleZipFile(content);
    outputFileName = name.replace(zipPattern, '.cats');
    packType = 'Vanilla Resource Pack';
    convertedType = 'Catharsis Resource Pack';
  } else {
    throw new PleadError('Unknown file format!');
  }

  return {
    output,
    outputFileName,
    packType,
    convertedType
  };
}

async function handleCatsZipFile(content) {
  const outerArchive = await ZipArchive.parse(content);

  if (!outerArchive.hasFile("pack.cats")) return content;

  const innerContent = outerArchive.getFile("pack.cats")

  const innerArchive = await CatArchive.parse(innerContent)

  const converted = new ZipArchive();

  innerArchive.transferTo(converted);

  return await converted.compress();
}

async function handleCatsFile(content) {
  const archive = await CatArchive.parse(content);

  const converted = new ZipArchive();

  archive.transferTo(converted);

  return await converted.compress();
}

async function handleZipFile(content) {
  const archive = await ZipArchive.parse(content);

  const converted = new CatArchive();

  archive.transferTo(converted);

  return await converted.compress();
}
