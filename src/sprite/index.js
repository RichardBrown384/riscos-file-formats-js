const { Png } = require('riscos-support');
const RiscOSView = require('../common/riscos-view');

const {
  readSpriteArea,
  readSprite,
  isSpriteAreaHeaderPresent,
} = require('./serialisation/read');
const { mapSprite } = require('./mapper');

module.exports = {
  SpriteArea: {
    isHeaderPresent(array) {
      const view = new RiscOSView(array.buffer);
      return isSpriteAreaHeaderPresent(view);
    },
    fromUint8Array(array) {
      const view = new RiscOSView(array.buffer);
      return readSpriteArea(view);
    },
  },
  Sprite: {
    fromUint8Array(array) {
      const view = new RiscOSView(array.buffer);
      return readSprite(view);
    },
    RGBAImage: {
      fromSprite(sprite) {
        return mapSprite(sprite);
      },
    },
    Png: {
      fromSprite(sprite) {
        const rgbaImage = mapSprite(sprite);
        const png = Png.fromRGBAImage(rgbaImage);
        const { pixels, ...rest } = rgbaImage;
        return { ...rest, png };
      },
    },
  },
};
