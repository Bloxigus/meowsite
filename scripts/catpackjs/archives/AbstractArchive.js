import { PleadError } from '../utils/Utils.js';

export class Archive {
  files;

  static parse(_buffer) {
    throw new PleadError('Implement this');
  }

  constructor(files) {
    this.files = files ?? new Map();
  }

  listFiles() {
    return [
      ...this.files.keys()
    ];
  }

  hasFile(fileName) {
    return this.files.has(fileName)
  }

  addFile(file) {
    this.files.set(file.name, file);
  }

  getFile(fileName) {
    return this.files.get(fileName)?.contents;
  }

  renameFile(oldName, newName) {
    const entry = this.files.get(oldName);
    if (entry === undefined)
      return;
    this.files.delete(oldName);
    this.files.set(newName, entry);
  }

  transferTo(newArchive) {
    for (const [_, file] of this.files) {
      newArchive.addFile(file);
    }
  }
}

export class File {
  name;
  contents;

  constructor(name, contents) {
    this.name = name;
    this.contents = contents;
  }
}
