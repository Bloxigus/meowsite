import { ReadableBuffer } from '../utils/ReadableBuffer.js';
import { PleadError } from '../utils/Utils.js';
import { Archive, File } from './AbstractArchive.js';

class Compression {
  static Gzip = 0xFE;
  static None = 0xFF;
}

class EntryType {
  static Directory = 1;
  static File = 0;
}

export class CatArchive extends Archive {
  static MAGIC = 0x43415453;
  static VERSION = 1;

  static async parse(buffer) {
    buffer.setEndianness(ReadableBuffer.ENDIANNESS_BIG);
    const magic = buffer.readS4();
    if (magic !== CatArchive.MAGIC)
      throw new PleadError('wrong magic');
    const version = buffer.readU1();
    if (version !== CatArchive.VERSION)
      throw new PleadError('unsupported version');
    const root = CatDirectory.parse(buffer);
    const data = buffer.subBuffer(buffer.remaining());
    const foldedFiles = root.fold();
    const entries = new Map();
    for (const [fileName, entry] of foldedFiles) {
      const fileEntry = await entry.toFile(fileName, data);
      entries.set(fileName, fileEntry);
    }
    return new CatArchive(entries);
  }

  async compress() {
    const constantHeader = ReadableBuffer.allocate(5);
    constantHeader.writeU4(CatArchive.MAGIC);
    constantHeader.writeU1(CatArchive.VERSION);
    const entries = new Map();
    const dataPieces = [];
    let dataLength = 0;

    for (const [fileName, file] of this.files) {
      let contents = await file.contents.compress('gzip');
      let compression = Compression.Gzip;
      if (contents.length > file.contents.length) {
        contents = file.contents;
        compression = Compression.None;
      }
      const length = contents.length;
      const catFile = new CatFile(dataLength, length, compression);
      entries.set(fileName, catFile);
      dataPieces.push(contents);
      dataLength += length;
    }
    const root = this.#generateMainDirectory(entries);
    return ReadableBuffer.from([
      constantHeader,
      root.compress(),
      ...dataPieces
    ]);
  }

  #generateMainDirectory(entries) {
    const root = new CatDirectory([]);
    for (const [entryName, entry] of entries) {
      let parent = root;
      const folderParts = entryName.split('/');
      const filePart = folderParts.pop();
      if (filePart === undefined)
        continue;
      for (const folderPart of folderParts) {
        let newParent = parent.entries.find((value) => value.name === folderPart && value.type === EntryType.Directory);
        if (newParent === undefined) {
          newParent = new CatEntry(folderPart, new CatDirectory([]), EntryType.Directory);
          parent.addEntry(newParent);
        }
        parent = newParent.entry;
      }
      parent.addEntry(new CatEntry(filePart, entry, EntryType.File));
    }
    return root;
  }
}

class CatEntry {
  name;
  entry;
  type;

  static parse(buffer) {
    const type = buffer.readU1();
    const nameLength = buffer.readU1();
    const name = buffer.readString(nameLength);
    switch (type) {
      case EntryType.File:
        return new CatEntry(name, CatFile.parse(buffer), EntryType.File);
      case EntryType.Directory:
        return new CatEntry(name, CatDirectory.parse(buffer), EntryType.Directory);
      default:
        throw new PleadError('Invalid entry type!');
    }
  }

  constructor(name, entry, type) {
    this.name = name;
    this.entry = entry;
    this.type = type;
  }

  compress() {
    const buffer = ReadableBuffer.allocate(2 + this.name.length);
    buffer.writeU1(this.type);
    buffer.writeU1(this.name.length);
    buffer.writeString(this.name);
    const buffers = [
      buffer,
      this.entry.compress()
    ];
    return ReadableBuffer.from(buffers);
  }
}

class CatDirectory {
  entries;

  static parse(buffer) {
    const count = buffer.readU2();
    const entries = [];
    for (let fileIndex = 0; fileIndex < count; fileIndex++) {
      const entry = CatEntry.parse(buffer);
      entries.push(entry);
    }
    return new CatDirectory(entries);
  }

  constructor(entries) {
    this.entries = entries;
  }

  addEntry(entry) {
    this.entries.push(entry);
  }

  fold() {
    const collection = new Map();
    for (const entry of this.entries) {
      switch (entry.type) {
        case EntryType.Directory: {
          const directory = entry.entry;
          const subEntries = directory.fold();
          for (const [subEntryName, subEntry] of subEntries) {
            collection.set(`${entry.name}/${subEntryName}`, subEntry);
          }
          break;
        }
        case EntryType.File: {
          const file = entry.entry;
          collection.set(entry.name, file);
          break;
        }
        default:
          throw new PleadError('Invalid entry!');
      }
    }
    return collection;
  }

  compress() {
    const buffer = ReadableBuffer.allocate(2);
    buffer.writeU2(this.entries.length);
    const buffers = [buffer];
    for (const entry of this.entries) {
      buffers.push(entry.compress());
    }
    return ReadableBuffer.from(buffers);
  }
}

class CatFile {
  offset;
  size;
  compression;

  static parse(buffer) {
    const offset = buffer.readS4();
    const size = buffer.readS4();
    const compression = buffer.readU1();
    return new CatFile(offset, size, compression);
  }

  constructor(offset, size, compression) {
    this.offset = offset;
    this.size = size;
    this.compression = compression;
  }

  async toFile(name, data) {
    const oldPointer = data.fork(this.offset);
    const fileData = data.subBuffer(this.size);
    data.fork(oldPointer);
    if (this.compression === Compression.None) {
      return new File(name, fileData);
    } else if (this.compression === Compression.Gzip) {
      return new File(name, await fileData.decompress('gzip'));
    } else {
      throw new PleadError('Invalid compression!');
    }
  }

  compress() {
    const buffer = ReadableBuffer.allocate(9);
    buffer.writeU4(this.offset);
    buffer.writeU4(this.size);
    buffer.writeU1(this.compression);
    return buffer;
  }
}
