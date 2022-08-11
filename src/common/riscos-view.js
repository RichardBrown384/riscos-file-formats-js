class RiscOSView {
  constructor(buffer, position = 0) {
    this.view = new DataView(buffer);
    this.length = buffer.byteLength;
    this.position = position;
  }

  getLength() {
    return this.length;
  }

  getPosition() {
    return this.position;
  }

  setPosition(v) {
    this.position = v;
  }

  readUint8() {
    const b = this.view.getUint8(this.position);
    this.position += 1;
    return b;
  }

  readUint16() {
    const v = this.view.getUint16(this.position, true);
    this.position += 2;
    return v;
  }

  readUint32() {
    const v = this.view.getUint32(this.position, true);
    this.position += 4;
    return v;
  }

  readInt8() {
    const b = this.view.getInt8(this.position);
    this.position += 1;
    return b;
  }

  readInt16() {
    const v = this.view.getInt16(this.position, true);
    this.position += 2;
    return v;
  }

  readInt32() {
    const v = this.view.getInt32(this.position, true);
    this.position += 4;
    return v;
  }

  readStringFully(n) {
    const chars = [];
    for (let i = 0, terminated = false; i < n; i += 1) {
      const c = this.readUint8();
      if (c === 0) {
        terminated = true;
      } else if (!terminated) {
        chars.push(c);
      }
    }
    return String.fromCharCode(...chars);
  }

  readString(n) {
    const codes = [];
    for (let i = 0; i < n; i += 1) {
      const c = this.readUint8();
      codes.push(c);
    }
    return String.fromCharCode(...codes);
  }
}

module.exports = RiscOSView;
