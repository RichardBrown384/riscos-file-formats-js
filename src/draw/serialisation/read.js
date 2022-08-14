/* eslint-disable no-bitwise */

const Constants = require('../constants');

const IDENTIFIER_DRAW = 'Draw';

const {
  fail,
  checkAlignment,
} = require('../../common/checks');

function readPoint(view) {
  checkAlignment(view, 'misaligned point');
  const x = view.readInt32();
  const y = view.readInt32();
  return { x, y };
}

function readBoundingBox(view) {
  checkAlignment(view, 'misaligned bounding box');
  const minX = view.readInt32();
  const minY = view.readInt32();
  const maxX = view.readInt32();
  const maxY = view.readInt32();
  return {
    minX, minY, maxX, maxY,
  };
}

function readTransformationMatrix(view) {
  checkAlignment(view, 'misaligned transformation matrix');
  return [
    view.readInt32(),
    view.readInt32(),
    view.readInt32(),
    view.readInt32(),
    view.readInt32(),
    view.readInt32(),
  ];
}

function readPathElement(view) {
  checkAlignment(view, 'misaligned path element');
  const tag = view.readUint32();
  if (tag === Constants.PATH_TAG_END
        || tag === Constants.PATH_TAG_UNKNOWN
        || tag === Constants.PATH_TAG_CLOSE_SUB_PATH) {
    return { tag };
  }
  if (tag === Constants.PATH_TAG_MOVE || tag === Constants.PATH_TAG_LINE) {
    const p0 = readPoint(view);
    return { tag, points: [p0] };
  }
  if (tag === Constants.PATH_TAG_BEZIER) {
    const p0 = readPoint(view);
    const p1 = readPoint(view);
    const p2 = readPoint(view);
    return { tag, points: [p0, p1, p2] };
  }
  fail('unsupported path tag', { tag: tag.toString(16) });
  return {};
}

function readPath(view, end) {
  checkAlignment(view, 'misaligned path');
  const path = [];
  while (view.getPosition() < end) {
    path.push(readPathElement(view));
  }
  return path;
}

function readDash(view) {
  checkAlignment(view, 'misaligned dash');
  const offset = view.readInt32();
  const count = view.readUint32();
  const array = [];
  for (let i = 0; i < count; i += 1) {
    array.push(view.readInt32());
  }
  return { offset, array };
}

function readPathStyle(view) {
  checkAlignment(view, 'misaligned path style');
  const style = view.readUint32();
  let dash;
  if ((style >> 7) & 0x1) {
    dash = readDash(view);
  }
  return {
    join: style & 0x3,
    capEnd: (style >> 2) & 0x3,
    capStart: (style >> 4) & 0x3,
    windingRule: (style >> 6) & 0x1,
    ...(dash && { dash }),
    triangleCapWidth: (style >> 16) & 0xFF,
    triangleCapLength: (style >> 24) & 0xFF,
  };
}

function readHeader(view) {
  checkAlignment(view, 'misaligned header');
  return {
    identifier: view.readStringFully(4),
    majorVersion: view.readUint32(),
    minorVersion: view.readUint32(),
    program: view.readStringFully(12),
    boundingBox: readBoundingBox(view),
  };
}

function readPathObject(view, end) {
  checkAlignment(view, 'misaligned path object');
  return {
    boundingBox: readBoundingBox(view),
    fillColour: view.readUint32(),
    outlineColour: view.readUint32(),
    outlineWidth: view.readUint32(),
    pathStyle: readPathStyle(view),
    path: readPath(view, end),
  };
}

function readSpriteObject(view, end) {
  checkAlignment(view, 'misaligned sprite object');
  return {
    boundingBox: readBoundingBox(view),
    start: view.getPosition(),
    end,
  };
}

function readGroupObject(view) {
  checkAlignment(view, 'misaligned group object');
  return {
    boundingBox: readBoundingBox(view),
    name: view.readStringFully(12),
  };
}

function readOptionsObject(view) {
  checkAlignment(view, 'misaligned options object');
  return {
    boundingBox: readBoundingBox(view),
    paperSize: view.readUint32(),
    paperLimits: view.readUint32(),
    gridSpacing1: view.readUint32(),
    gridSpacing2: view.readUint32(),
    gridDivision: view.readUint32(),
    gridType: view.readUint32(),
    gridAutoAdjustment: view.readUint32(),
    gridShown: view.readUint32(),
    gridLocking: view.readUint32(),
    gridUnits: view.readUint32(),
    zoomMultiplier: view.readUint32(),
    zoomDivider: view.readUint32(),
    zoomLocking: view.readUint32(),
    toolboxPresent: view.readUint32(),
    entryMode: view.readUint32(),
    undoBufferSizeBytes: view.readUint32(),
  };
}

function readSpriteRotatedObject(view, end) {
  checkAlignment(view, 'misaligned sprite rotated object');
  return {
    boundingBox: readBoundingBox(view),
    transform: readTransformationMatrix(view),
    start: view.getPosition(),
    end,
  };
}

function readObjectForType(view, type, end) {
  checkAlignment(view, 'misaligned object body');
  switch (type) {
    case Constants.OBJECT_TYPE_PATH:
      return readPathObject(view, end);
    case Constants.OBJECT_TYPE_SPRITE:
      return readSpriteObject(view, end);
    case Constants.OBJECT_TYPE_GROUP:
      return {
        size: 36,
        ...readGroupObject(view),
      };
    case Constants.OBJECT_TYPE_OPTIONS:
      return readOptionsObject(view);
    case Constants.OBJECT_TYPE_SPRITE_ROTATED:
      return readSpriteRotatedObject(view);
    default:
      return {};
  }
}

function readObject(view) {
  checkAlignment(view, 'misaligned object');
  const objectPosition = view.getPosition();
  const type = view.readInt32();
  const size = view.readInt32();
  const end = objectPosition + size;
  return {
    type,
    size,
    ...readObjectForType(view, type, end),
  };
}

function readDraw(view) {
  const header = readHeader(view);
  const objects = [];
  while (view.getPosition() < view.getLength()) {
    const position = view.getPosition();
    const object = readObject(view);
    objects.push(object);
    view.setPosition(position + object.size);
  }
  return {
    header,
    objects,
  };
}

function isDrawHeaderPresent(view) {
  return readHeader(view).identifier === IDENTIFIER_DRAW;
}

module.exports = {
  readDraw,
  isDrawHeaderPresent,
};
