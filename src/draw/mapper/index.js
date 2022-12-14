const { Sprite } = require('../../sprite');

const MergingBoundingBox = require('./merging-bounding-box');

const Constants = require('../constants');

const { mapPath, mapSvg, mapImage } = require('./svg');

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
  return mapPath(path, attributes);
}

function mapSprite(array, start, end) {
  const slice = array.slice(start, end);
  const sprite = Sprite.fromUint8Array(slice);
  return Sprite.Png.fromSprite(sprite);
}

function mapSpriteObject(boundingBox, spriteObject, array) {
  const {
    start,
    end,
  } = spriteObject;
  const { png } = mapSprite(array, start, end);
  const {
    minX, maxX, minY, maxY,
  } = boundingBox;
  const width = maxX - minX;
  const height = maxY - minY;
  const transform = [1, 0, 0, 1, minX, minY];
  return mapImage(png, width, height, transform);
}

function mapSpriteRotatedObject(spriteObject, array) {
  const {
    transform: drawTransform,
    start,
    end,
  } = spriteObject;
  const {
    png,
    width: pixelWidth,
    height: pixelHeight,
    xDpi = 90,
    yDpi = 90,
  } = mapSprite(array, start, end);
  const width = (pixelWidth * DRAW_UNITS_PER_INCH) / xDpi;
  const height = (pixelHeight * DRAW_UNITS_PER_INCH) / yDpi;
  const transform = mapTransform(drawTransform);
  return mapImage(png, width, height, transform);
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

  return mapSvg({
    fileBoundingBox,
    objects: mappedObjects,
  });
}

module.exports = {
  mapDraw,
};
