const { Png, Base64 } = require('riscos-support');
const { Sprite } = require('../../sprite');

const { extractBitField } = require('../../common/bitwise');
const MergingBoundingBox = require('./merging-bounding-box');

const Constants = require('../constants');

const DRAW_UNITS_TO_USER_UNITS = (1.0 / 640.0) * (4.0 / 3.0);
const DRAW_UNITS_PER_INCH = 180 * 256;

const FIXED_POINT_CONVERSION_FACTOR = 65536.0;

const MIN_STROKE_WIDTH = 160;

const TAG_MAP = {
  [Constants.PATH_TAG_END]: '',
  [Constants.PATH_TAG_MOVE]: 'M',
  [Constants.PATH_TAG_CLOSE_SUB_PATH]: 'Z',
  [Constants.PATH_TAG_BEZIER]: 'C',
  [Constants.PATH_TAG_LINE]: 'L',
};

const JOIN_MAP = {
  [Constants.JOIN_MITRE]: 'mitre',
  [Constants.JOIN_ROUND]: 'round',
  [Constants.JOIN_BEVEL]: 'bevel',
};

const CAP_MAP = {
  [Constants.CAP_BUTT]: 'butt',
  [Constants.CAP_ROUND]: 'round',
  [Constants.CAP_SQUARE]: 'square',
  [Constants.CAP_TRIANGLE]: 'triangle',
};

function mapTransform(transform) {
  return [
    ...transform.slice(0, 4).map((x) => x / FIXED_POINT_CONVERSION_FACTOR),
    ...transform.slice(4),
  ];
}

function mapPathData(elements) {
  const path = [];
  for (let i = 0; i < elements.length; i += 1) {
    const { tag, points = [] } = elements[i];
    path.push(TAG_MAP[tag]);
    path.push(points.flatMap(({ x, y }) => [x, y]).join(','));
  }
  return path.join('');
}

function mapColour(colour) {
  if (colour === 0xFFFFFFFF) {
    return 'none';
  }
  const elements = [
    extractBitField(colour, 8, 8),
    extractBitField(colour, 16, 8),
    extractBitField(colour, 24, 8),
  ];
  return `rgb(${elements})`;
}

function mapStrokeWidth(outlineWidth) {
  return Math.max(MIN_STROKE_WIDTH, outlineWidth);
}

function mapJoin(join) {
  return join !== Constants.JOIN_MITRE && { 'stroke-linejoin': JOIN_MAP[join] };
}

function mapCapStart(capStart) {
  return capStart in [Constants.CAP_SQUARE, Constants.CAP_ROUND]
        && { 'stroke-linecap': CAP_MAP[capStart] };
}

function mapWindingRule(windingRule) {
  return windingRule === Constants.WINDING_EVEN_ODD
      && { 'fill-rule': 'evenodd' };
}

function mapStrokeDashoffset(strokeDashoffset) {
  return strokeDashoffset && { 'stroke-dashoffset': strokeDashoffset };
}

function mapStrokeDashArray(strokeDasharray) {
  return strokeDasharray && { 'stroke-dasharray': strokeDasharray };
}

function mapPathObject(pathObject) {
  const {
    fillColour,
    outlineColour,
    outlineWidth,
    pathStyle: {
      join,
      capStart,
      windingRule,
      dash,
    },
    path,
  } = pathObject;
  const {
    offset: strokeDashoffset,
    array: strokeDasharray,
  } = dash || {};
  return {
    tag: 'path',
    attributes: {
      d: mapPathData(path),
      fill: mapColour(fillColour),
      stroke: mapColour(outlineColour),
      'stroke-width': mapStrokeWidth(outlineWidth),
      ...(mapJoin(join)),
      ...(mapCapStart(capStart)),
      ...(mapWindingRule(windingRule)),
      ...(mapStrokeDashoffset(strokeDashoffset)),
      ...(mapStrokeDashArray(strokeDasharray)),
    },
  };
}

function mapSpriteObject(boundingBox, spriteObject, array) {
  const {
    start,
    end,
  } = spriteObject;
  const slice = array.slice(start, end);
  const sprite = Sprite.fromUint8Array(slice);
  const rgbaImage = Sprite.RGBAImage.fromSprite(sprite);
  const png = Png.fromRGBAImage(rgbaImage);
  const data = Base64.fromUint8Array(png);
  const {
    minX, maxX, minY, maxY,
  } = boundingBox;
  const width = maxX - minX;
  const height = maxY - minY;
  return {
    tag: 'image',
    attributes: {
      x: 0,
      y: 0,
      width,
      height,
      preserveAspectRatio: 'none',
      'xlink:Href': `data:image/png;base64,${data}`,
      transform: `translate(${minX}, ${minY}) translate(0, ${height}) scale(1, -1)`,
    },
  };
}

function mapSpriteRotatedObject(spriteObject, array) {
  const {
    transform: drawTransform,
    start,
    end,
  } = spriteObject;
  const slice = array.slice(start, end);
  const sprite = Sprite.fromUint8Array(slice);
  const rgbaImage = Sprite.RGBAImage.fromSprite(sprite);
  const png = Png.fromRGBAImage(rgbaImage);
  const data = Base64.fromUint8Array(png);
  const {
    pixelWidth,
    pixelHeight,
    xDpi = 90,
    yDpi = 90,
  } = sprite;
  const width = (pixelWidth * DRAW_UNITS_PER_INCH) / xDpi;
  const height = (pixelHeight * DRAW_UNITS_PER_INCH) / yDpi;
  const transform = mapTransform(drawTransform);
  return {
    tag: 'image',
    attributes: {
      x: 0,
      y: 0,
      width,
      height,
      preserveAspectRatio: 'none',
      'xlink:href': `data:image/png;base64,${data}`,
      transform: `matrix(${transform}) translate(0, ${height}) scale(1, -1)`,
    },
  };
}

function mapObjects(fileBoundingBox, objects, array) {
  const mappedObjects = [];
  for (let i = 0; i < objects.length; i += 1) {
    const { type, boundingBox, ...data } = objects[i];
    fileBoundingBox.merge(boundingBox);
    switch (type) {
      case Constants.OBJECT_TYPE_PATH: {
        mappedObjects.push(mapPathObject(data));
        break;
      }
      case Constants.OBJECT_TYPE_SPRITE: {
        mappedObjects.push(mapSpriteObject(boundingBox, data, array));
        break;
      }
      case Constants.OBJECT_TYPE_SPRITE_ROTATED: {
        mappedObjects.push(mapSpriteRotatedObject(data, array));
        break;
      }
      default:
        break;
    }
  }
  return mappedObjects;
}

function mapDraw({
  header: {
    boundingBox: headerBoundingBox,
  },
  objects,
}, array) {
  const fileBoundingBox = new MergingBoundingBox(headerBoundingBox);

  const mappedObjects = mapObjects(fileBoundingBox, objects, array);

  const {
    minX, maxX, minY, maxY,
  } = fileBoundingBox;

  const viewBoxWidth = Math.max(maxX - minX, 1);
  const viewBoxHeight = Math.max(maxY - minY, 1);

  const width = viewBoxWidth * DRAW_UNITS_TO_USER_UNITS;
  const height = viewBoxHeight * DRAW_UNITS_TO_USER_UNITS;

  return {
    tag: 'svg',
    attributes: {
      width,
      height,
      viewBox: `${minX} ${-maxY} ${viewBoxWidth} ${viewBoxHeight}`,
      xmlns: 'http://www.w3.org/2000/svg',
      'xmlns:xlink': 'http://www.w3.org/1999/xlink',
    },
    children: [{
      tag: 'g',
      attributes: {
        transform: 'scale(1, -1)',
      },
      children: mappedObjects,
    }],
  };
}

module.exports = {
  mapDraw,
};
