const { Png, Base64 } = require('riscos-support');
const { Sprite } = require('../../sprite');

const MergingBoundingBox = require('./merging-bounding-box');

const Constants = require('../constants');
const mapPathElements = require('./path-elements-map');
const mapPathAttributes = require('./path-attributes-map');

const DRAW_UNITS_TO_USER_UNITS = (1.0 / 640.0) * (4.0 / 3.0);
const DRAW_UNITS_PER_INCH = 180 * 256;

const FIXED_POINT_CONVERSION_FACTOR = 65536.0;

function mapTransform(transform) {
  return [
    ...transform.slice(0, 4).map((x) => x / FIXED_POINT_CONVERSION_FACTOR),
    ...transform.slice(4),
  ];
}

function mapPathObject(pathObject) {
  const { path, ...attributes } = pathObject;
  return {
    tag: 'path',
    attributes: {
      d: mapPathElements(path),
      ...(mapPathAttributes(attributes)),
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
      'xlink:href': `data:image/png;base64,${data}`,
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
