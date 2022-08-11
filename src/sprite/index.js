const RiscOSView = require('../common/riscos-view');

const {
  readSpriteArea,
  readSprite,
} = require('./serialisation/read');
const { mapSprite } = require('./mapper');

module.exports = {
  SpriteArea: {
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
  },
};
