const { extractBitField, logicalShiftLeft } = require('../../common/bitwise');

function selectPalette(sprite) {
  const {
    bitsPerPixel,
    palette = [],
    wimpPalette,
  } = sprite;
  return (palette.length === logicalShiftLeft(1, bitsPerPixel)) ? palette : wimpPalette;
}

function mapSprite(sprite) {
  const {
    pixelWidth: width,
    pixelHeight: height,
    image,
    mask = [],
  } = sprite;
  const palette = selectPalette(sprite);
  const pixels = [];
  for (let n = 0; n < image.length; n += 1) {
    const { first: bgr_ } = palette[image[n]];
    const alpha = (mask[n] === 0) ? 0 : 0xFF;
    pixels.push(extractBitField(bgr_, 8, 8));
    pixels.push(extractBitField(bgr_, 16, 8));
    pixels.push(extractBitField(bgr_, 24, 8));
    pixels.push(alpha);
  }
  return {
    width,
    height,
    pixels,
  };
}

module.exports = {
  mapSprite,
};
