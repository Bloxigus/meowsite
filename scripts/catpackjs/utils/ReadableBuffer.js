import { PleadError } from './Utils.js';

export class Pointer {
  static at(index) {
    return new this(index);
  }

  index;

  constructor(index = 0) {
    this.index = index || 0;
  }

  advance(count) {
    this.index += count;
    return this.index - count;
  }

  split() {
    return new Pointer(this.index);
  }

  set(index) {
    this.index = index;
  }
}

const stringDecoderUtf8 = new TextDecoder('utf-8');
const stringEncoder = new TextEncoder();
const defaultArrayBuffer = new ArrayBuffer();
const defaultDataView = new DataView(defaultArrayBuffer);

export class ReadableBuffer {
  static allocate(length) {
    return new ReadableBuffer(new ArrayBuffer(length));
  }

  static from(backingBuffer) {
    let buffer;
    if (backingBuffer instanceof ArrayBuffer) {
      buffer = backingBuffer;
    } else if (backingBuffer instanceof DataView) {
      buffer = backingBuffer.buffer;
    } else if (backingBuffer instanceof Uint8Array) {
      buffer = backingBuffer.buffer;
    } else if (typeof backingBuffer == 'string') {
      buffer = stringEncoder.encode(backingBuffer).buffer;
    } else if (Array.isArray(backingBuffer)) {
      if (backingBuffer[0] instanceof ReadableBuffer) {
        let totalLength = 0;
        for (let i = 0; i < backingBuffer.length; i++) {
          totalLength += backingBuffer[i].length;
        }
        const newBuffer = ReadableBuffer.allocate(totalLength);
        for (let i = 0; i < backingBuffer.length; i++) {
          newBuffer.writeSubBuffer(backingBuffer[i]);
        }
        newBuffer.fork(0);
        return newBuffer;
      } else if (backingBuffer[0] instanceof Uint8Array) {
        let totalLength = 0;
        for (let i = 0; i < backingBuffer.length; i++) {
          totalLength += backingBuffer[i].length;
        }
        const newBuffer = ReadableBuffer.allocate(totalLength);
        for (let i = 0; i < backingBuffer.length; i++) {
          for (let j = 0; j < backingBuffer[i].length; j++) {
            newBuffer.writeU1(backingBuffer[i][j]);
          }
        }
        newBuffer.fork(0);
        return newBuffer;
      } else if (backingBuffer.length === 0) {
        buffer = new ArrayBuffer(0);
      } else {
        throw new PleadError(':(');
      }
    }
    return new ReadableBuffer(buffer);
  }

  static ENDIANNESS_BIG = true;
  static ENDIANNESS_LITTLE = false;
  internalPointer = Pointer.at(0);
  endian = false;
  length = 0;
  buffer = defaultDataView;
  u8Array;

  constructor(backingBuffer) {
    this.buffer = new DataView(backingBuffer);
    this.length = backingBuffer.byteLength;
    this.u8Array = new Uint8Array(this.buffer.buffer);
  }

  setEndianness(isBig = true) {
    this.endian = !isBig;
  }

  fork(newPointer) {
    const old = this.internalPointer.index;
    this.internalPointer.set(newPointer);
    return old;
  }

  has(count) {
    return this.internalPointer.index + count < this.length;
  }

  validIndex(index) {
    return index < this.length;
  }

  readString(maxLength) {
    const chars = [];
    for (let i = 0; i < maxLength; i++) {
      const char = this.readU1();
      if (char !== 0)
        chars.push(char);
    }
    return String.fromCharCode(...chars);
  }

  writeString(string) {
    let index = 0;
    for (; index < string.length; index++) {
      this.writeU1(string.charCodeAt(index));
    }
    return index;
  }

  readNullTerminatedString() {
    const chars = [];
    while (this.peek(this.readU1) !== 0) {
      const char = this.readU1();
      chars.push(char);
    }
    return String.fromCharCode(...chars);
  }

  getIndex() {
    return this.internalPointer.index;
  }

  advance(number) {
    this.internalPointer.advance(number);
    return this;
  }

  hasNext() {
    return this.internalPointer.index < this.length;
  }

  remaining() {
    return this.length - this.internalPointer.index;
  }

  back(number) {
    this.internalPointer.advance(-number);
    return this;
  }

  reset() {
    this.internalPointer.index = 0;
    return this;
  }

  peek(readT) {
    const oldPointer = this.internalPointer.index;
    const result = readT();
    this.internalPointer.set(oldPointer);
    return result;
  }

  readDouble() {
    return this.buffer.getFloat64(this.internalPointer.advance(8), this.endian);
  }

  readFloat() {
    return this.buffer.getFloat32(this.internalPointer.advance(4), this.endian);
  }

  readU1() {
    return this.u8Array[this.internalPointer.advance(1)];
  }

  readU2() {
    return this.buffer.getUint16(this.internalPointer.advance(2), this.endian);
  }

  readU4() {
    return this.buffer.getUint32(this.internalPointer.advance(4), this.endian);
  }

  readU8() {
    return this.buffer.getBigUint64(this.internalPointer.advance(8), this.endian);
  }

  readS1() {
    return this.buffer.getInt8(this.internalPointer.advance(1));
  }

  readS2() {
    return this.buffer.getInt16(this.internalPointer.advance(2), this.endian);
  }

  readS4() {
    return this.buffer.getInt32(this.internalPointer.advance(4), this.endian);
  }

  readS8() {
    return this.buffer.getBigInt64(this.internalPointer.advance(8), this.endian);
  }

  writeDouble(value) {
    this.buffer.setFloat64(this.internalPointer.advance(8), value, this.endian);
  }

  writeFloat(value) {
    this.buffer.setFloat32(this.internalPointer.advance(4), value, this.endian);
  }

  writeU1(value) {
    this.u8Array[this.internalPointer.advance(1)] = value;
  }

  writeU2(value) {
    this.buffer.setUint16(this.internalPointer.advance(2), value, this.endian);
  }

  writeU4(value) {
    this.buffer.setUint32(this.internalPointer.advance(4), value, this.endian);
  }

  writeU8(value) {
    this.buffer.setBigUint64(this.internalPointer.advance(8), value, this.endian);
  }

  writeS1(value) {
    this.buffer.setInt8(this.internalPointer.advance(1), value);
  }

  writeS2(value) {
    this.buffer.setInt16(this.internalPointer.advance(2), value, this.endian);
  }

  writeS4(value) {
    this.buffer.setInt32(this.internalPointer.advance(4), value, this.endian);
  }

  writeS8(value) {
    this.buffer.setBigUint64(this.internalPointer.advance(8), value, this.endian);
  }

  subBuffer(length) {
    const startIndex = this.getIndex();
    const newBuffer = ReadableBuffer.allocate(length);
    for (let index = 0; index < length; index++) {
      newBuffer.u8Array[index] = this.u8Array[index + startIndex];
    }
    this.advance(length);
    return newBuffer;
  }

  writeSubBuffer(subBuffer) {
    for (let i = 0; i < subBuffer.length; i++) {
      this.u8Array[this.internalPointer.index + i] = subBuffer.u8Array[i];
    }
    this.advance(subBuffer.length);
  }

  toString() {
    return stringDecoderUtf8.decode(this.buffer);
  }

  async decompress(method = 'deflate') {
    if (this.length === 0)
      return this;
    const technique = method === 'deflate' ? 'deflate-raw' : method === 'gzip' ? 'gzip' : 'deflate';
    const decompressionStream = new DecompressionStream(technique);
    const writer = decompressionStream.writable.getWriter();
    writer.write(this.buffer);
    writer.close();
    const reader = decompressionStream.readable.getReader();
    const chunks = [];
    while (true) {
      const { value: chunk, done } = await reader.read();
      if (done)
        return ReadableBuffer.from(chunks);
      chunks.push(chunk);
    }
  }

  async compress(method = 'deflate') {
    if (this.length === 0)
      return this;
    const technique = method === 'deflate' ? 'deflate-raw' : method === 'gzip' ? 'gzip' : 'deflate';
    const compressionStream = new CompressionStream(technique);
    const writer = compressionStream.writable.getWriter();
    writer.write(this.buffer);
    writer.close();
    const reader = compressionStream.readable.getReader();
    const chunks = [];
    while (true) {
      const { value: chunk, done } = await reader.read();
      if (done)
        return ReadableBuffer.from(chunks);
      chunks.push(chunk);
    }
  }

  static #CRC_TABLE = (function() {
    let c;
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[n] = c;
    }
    return crcTable;
  })();

  crc32() {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < this.length; i++) {
      crc = (crc >>> 8) ^ ReadableBuffer.#CRC_TABLE[(crc ^ this.u8Array[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }
}
