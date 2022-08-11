const {
  logicalShiftLeft,
  isBitClear,
  isBitSet,
} = require('../../common/bitwise');

const RiscOSView = require('../../common/riscos-view');

const {
  check,
} = require('../../common/checks');

function hasBoundingBoxData(flags) {
  return isBitClear(flags, 0);
}

function hasXOffsetData(flags) {
  return isBitClear(flags, 1);
}

function hasYOffsetData(flags) {
  return isBitClear(flags, 2);
}

function hasDataAfterMetrics(flags) {
  return isBitSet(flags, 3);
}

function hasCharacterMapSize(flags) {
  return isBitSet(flags, 5);
}

function has16BitKernCharacters(flags) {
  return isBitSet(flags, 6);
}

function readMiscellaneous(buffer, position, flags) {
  if (position >= buffer.byteLength) {
    return {};
  }

  const d = new RiscOSView(buffer, position);

  return {
    boundingBox: {
      x0: d.readInt16(),
      y0: d.readInt16(),
      x1: d.readInt16(),
      y1: d.readInt16(),
    },
    defaultXOffset: hasXOffsetData(flags) ? d.readInt16() : 0,
    defaultYOffset: hasYOffsetData(flags) ? d.readInt16() : 0,
    italicHOffsetPerEm: d.readInt16(),
    underlinePosition: d.readInt8(),
    underlineThickness: d.readUint8(),
    capHeight: d.readInt16(),
    xHeight: d.readInt16(),
    descender: d.readInt16(),
    ascender: d.readInt16(),
  };
}

function readKerningPairs(buffer, position, flags) {
  if (position >= buffer.byteLength) {
    return {};
  }

  const d = new RiscOSView(buffer, position);

  function getCharCode() {
    return has16BitKernCharacters(flags) ? d.readInt16() : d.readUint8();
  }

  const pairs = {};
  for (let leftCode = getCharCode(); leftCode !== 0; leftCode = getCharCode()) {
    const data = {};
    for (let rightCode = getCharCode(); rightCode !== 0; rightCode = getCharCode()) {
      data[rightCode] = {
        x: hasXOffsetData(flags) ? d.readInt16() : 0,
        y: hasYOffsetData(flags) ? d.readInt16() : 0,
      };
    }
    pairs[leftCode] = data;
  }

  return pairs;
}

function readMetrics(buffer, position = 0) {
  const d = new RiscOSView(buffer, position);

  const name = d.readString(40);
  const unknown40 = d.readUint32();
  const unknown44 = d.readUint32();
  const nLow = d.readUint8();
  const version = d.readUint8();
  const flags = d.readUint8();
  const nHigh = d.readUint8();

  check([0, 2].includes(version), `Metric version ${version} is not supported.`);
  if (version === 0) {
    check(
      flags === 0 && nHigh === 0,
      'Version 0 files must have 0 flags and no more than 256 characters defined',
    );
  }

  const n = logicalShiftLeft(nHigh, 8) + nLow;

  const mapSize = hasCharacterMapSize(flags) ? d.readUint16() : 256;

  const map = [];
  for (let i = 0; i < mapSize; i += 1) {
    map.push(d.readUint8());
  }

  const boundingBoxes = [];
  if (hasBoundingBoxData(flags)) {
    for (let i = 0; i < n; i += 1) {
      boundingBoxes.push({
        x0: d.readInt16(),
        y0: d.readInt16(),
        x1: d.readInt16(),
        y1: d.readInt16(),
      });
    }
  }

  const xOffsets = [];
  if (hasXOffsetData(flags)) {
    for (let i = 0; i < n; i += 1) {
      xOffsets.push(d.readInt16());
    }
  }

  const yOffsets = [];
  if (hasYOffsetData(flags)) {
    for (let i = 0; i < n; i += 1) {
      yOffsets.push(d.readInt16());
    }
  }

  let miscellaneous = {};
  let kerning = {};
  if (hasDataAfterMetrics(flags)) {
    const tablePosition = d.getPosition();
    const offsetMiscellaneous = d.readUint16();
    const offsetKerning = d.readUint16();

    miscellaneous = readMiscellaneous(buffer, tablePosition + offsetMiscellaneous, flags);
    kerning = readKerningPairs(buffer, tablePosition + offsetKerning, flags);
  }

  return {
    name: name.trimEnd(),
    unknown40,
    unknown44,
    version,
    flags,
    n,
    mapSize,
    map,
    boundingBoxes,
    xOffsets,
    yOffsets,
    miscellaneous,
    kerning,
  };
}

module.exports = {
  readMetrics,
};
