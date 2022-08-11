const Constants = require('../constants');

const {
  logicalShiftLeft,
  extractBitField,
  isBitSet,
  signExtend,
} = require('../../common/bitwise');

const RiscOSView = require('../../common/riscos-view');

const {
  check,
} = require('../../common/checks');

function signExtend12(v) {
  return signExtend(v, 12);
}

function readCharacter(buffer, position) {
  const d = new RiscOSView(buffer, position);

  const flags = d.readUint8();

  const has12BitCoordinates = isBitSet(flags, 0);
  const isOutline = isBitSet(flags, 3);
  const hasCompositeBaseCharacter = isBitSet(flags, 4);
  const hasCompositeAccentCharacter = isBitSet(flags, 5);
  const has16BitCharacterCodes = isBitSet(flags, 6);

  check(isOutline, 'Bitmap characters not supported');

  function readCharacterCode() {
    return (has16BitCharacterCodes) ? d.readUint16() : d.readUint8();
  }

  function readCoordinates() {
    if (has12BitCoordinates) {
      const a = d.readUint8();
      const b = d.readUint8();
      const c = d.readUint8();
      const x = logicalShiftLeft(b, 8) + a;
      const y = logicalShiftLeft(c, 4) + extractBitField(b, 4, 4);
      return [signExtend12(x), signExtend12(y)];
    }
    return [d.readInt8(), d.readInt8()];
  }

  function readCurveCoordinates() {
    return [
      readCoordinates(), readCoordinates(), readCoordinates(),
    ].flatMap((x) => x);
  }

  function readBoundingBox() {
    const [x0, y0] = readCoordinates();
    const [width, height] = readCoordinates();
    return {
      x0, y0, width, height,
    };
  }

  const paths = [];
  function pushPath(path) {
    paths.push(path);
  }

  function readPath() {
    const path = [];
    for (;;) {
      const segment = d.readUint8();
      const type = extractBitField(segment, 0, 2);
      const xScaffold = extractBitField(segment, 2, 3);
      const yScaffold = extractBitField(segment, 5, 3);
      if (type === Constants.OUTLINE_SEGMENT_MOVE
          || type === Constants.OUTLINE_SEGMENT_LINE) {
        path.push({
          type, xScaffold, yScaffold, coords: readCoordinates(),
        });
      } else if (type === Constants.OUTLINE_SEGMENT_CURVE) {
        path.push({
          type, xScaffold, yScaffold, coords: readCurveCoordinates(),
        });
      } else {
        check(type === Constants.OUTLINE_SEGMENT_TERMINATOR, 'unsupported segment type');
        pushPath(path);
        return segment;
      }
    }
  }

  const composites = [];
  function pushComposite(code, offset) {
    composites.push({ code, offset });
  }

  function readComposites() {
    let code = readCharacterCode();
    while (code !== 0) {
      pushComposite(code, readCoordinates());
      code = readCharacterCode();
    }
  }

  if (hasCompositeBaseCharacter) {
    pushComposite(readCharacterCode(), [0, 0]);
    if (hasCompositeAccentCharacter) {
      pushComposite(readCharacterCode(), readCoordinates());
    }
    return {
      position,
      flags,
      composites,
    };
  }

  const boundingBox = readBoundingBox();
  let segment = readPath();
  while (isBitSet(segment, 2)) {
    segment = readPath();
  }
  if (isBitSet(segment, 3)) {
    readComposites();
  }

  const [fillPath, ...strokePaths] = paths;

  return {
    position,
    flags,
    boundingBox,
    fillPath,
    strokePaths,
    composites,
  };
}

function readChunk(buffer, position, version, dependencyByteCount) {
  const d = new RiscOSView(buffer, position);

  function readChunkFlags() {
    if (version < 6) {
      return 0;
    }
    if (version < 7) {
      return 0x80;
    }
    return d.readUint32();
  }

  const chunkFlags = readChunkFlags();

  const hasDependencyBytes = isBitSet(chunkFlags, 7);

  const characterOffsetStart = d.getPosition();
  const charOffsets = [];
  for (let i = 0; i < 32; i += 1) {
    charOffsets.push(d.readUint32());
  }

  const dependencyBytes = [];
  if (hasDependencyBytes) {
    for (let i = 0; i < dependencyByteCount; i += 1) {
      dependencyBytes.push(d.readUint8());
    }
  }

  const characters = {};
  for (let i = 0; i < 32; i += 1) {
    if (charOffsets[i] !== 0) {
      const charOffset = characterOffsetStart + charOffsets[i];
      characters[i] = readCharacter(buffer, charOffset);
    }
  }

  return {
    position,
    chunkFlags,
    charOffsets,
    dependencyBytes,
    characters,
  };
}

function readChunks(buffer, position, version, chunkCount) {
  const d = new RiscOSView(buffer, position);

  const chunkOffsets = [];
  for (let i = 0; i < chunkCount + 1; i += 1) {
    chunkOffsets.push(d.readUint32());
  }

  const dependencyByteCount = Math.trunc((chunkCount + 7) / 8);
  const chunks = {};
  for (let i = 0; i < chunkCount; i += 1) {
    if (chunkOffsets[i] !== chunkOffsets[i + 1]) {
      chunks[i] = readChunk(buffer, chunkOffsets[i], version, dependencyByteCount);
    }
  }

  return chunks;
}

function readScaffoldData(buffer, position, has16BitCharacter = true) {
  const d = new RiscOSView(buffer, position);

  function readScaffoldLine() {
    const data = d.readUint16();
    const width = d.readUint8();
    return {
      coordinate: signExtend12(data),
      link: extractBitField(data, 12, 3),
      linear: isBitSet(data, 15),
      width,
    };
  }

  function readScaffoldLines(mask) {
    const lines = {};
    for (let i = 0; i < 8; i += 1) {
      if (isBitSet(mask, i)) {
        lines[i] = readScaffoldLine();
      }
    }
    return lines;
  }

  const base = has16BitCharacter ? d.readUint16() : d.readUint8();
  const xBaseDefinitions = d.readUint8();
  const yBaseDefinitions = d.readUint8();
  const xLocalDefinitions = d.readUint8();
  const yLocalDefinitions = d.readUint8();
  const xLines = readScaffoldLines(xLocalDefinitions);
  const yLines = readScaffoldLines(yLocalDefinitions);

  return {
    base,
    xBaseDefinitions,
    yBaseDefinitions,
    xLocalDefinitions,
    yLocalDefinitions,
    xLines,
    yLines,
  };
}

function readScaffold(buffer, position, indexCount, flags) {
  const d = new RiscOSView(buffer, position);

  const all16BitCharacterCodes = isBitSet(flags, 0);

  const dataSize = d.readUint16();
  const offsets = [];
  for (let i = 0; i < indexCount - 1; i += 1) {
    offsets.push(d.readUint16());
  }
  const skeletonThresholdPixelSize = d.readUint8();

  const data = {};
  for (let i = 0; i < offsets.length; i += 1) {
    const offset = offsets[i];
    if (offset !== 0) {
      if (all16BitCharacterCodes) {
        data[i] = readScaffoldData(buffer, position + offset);
      } else {
        data[i] = readScaffoldData(
          buffer,
          position + extractBitField(offset, 0, 14),
          isBitSet(offset, 15),
        );
      }
    }
  }

  return {
    flags,
    dataSize,
    data,
    skeletonThresholdPixelSize,
  };
}

function readOutlines(buffer, position = 0) {
  const d = new RiscOSView(buffer, position);

  const magic = d.readString(4);
  const bpp = d.readUint8();
  const version = d.readUint8();

  check(magic === 'FONT', 'Incorrect file signature, expected FONT');
  check(bpp === 0, 'Bitmap outline, expected outlines');
  check([6, 7, 8].includes(version), 'Only version 6, 7, and 8 outlines supported');

  const designSize = d.readUint16();

  const boundingBox = {
    x0: d.readInt16(),
    y0: d.readInt16(),
    width: d.readInt16(),
    height: d.readInt16(),
  };

  let chunkIndexOffset = d.getPosition();
  let chunkCount = 8;

  const scaffoldIndexOffset = d.getPosition() + 36;
  let scaffoldIndexCount = 256;
  let scaffoldFlags = 0;

  if (version > 7) {
    chunkIndexOffset = d.readUint32();
    chunkCount = d.readUint32();
    scaffoldIndexCount = d.readUint32();
    scaffoldFlags = d.readUint32();
  }

  const scaffold = readScaffold(buffer, scaffoldIndexOffset, scaffoldIndexCount, scaffoldFlags);

  const chunks = readChunks(buffer, chunkIndexOffset, version, chunkCount);

  return {
    header: {
      magic,
      bpp,
      version,
      designSize,
      boundingBox,
    },
    scaffold,
    chunkCount,
    chunks,
  };
}

module.exports = {
  readOutlines,
};
