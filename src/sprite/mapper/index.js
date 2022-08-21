const { extractBitField } = require('../../common/bitwise');

function selectPalette(sprite) {
  const {
    bitsPerPixel,
    palette = [],
    wimpPalette,
  } = sprite;
  return (palette.length === 2 ** bitsPerPixel) ? palette : wimpPalette;
}

function extractColourComponents(mask, bgrColour) {
  const alpha = (mask === 0) ? 0 : 0xFF;
  const r = extractBitField(bgrColour, 8, 8);
  const g = extractBitField(bgrColour, 16, 8);
  const b = extractBitField(bgrColour, 24, 8);
  return [r, g, b, alpha];
}

function mapSprite(sprite) {
  const {
    pixelWidth: width,
    pixelHeight: height,
    xDpi = 90,
    yDpi = 90,
    image,
    mask = [],
  } = sprite;
  const palette = selectPalette(sprite);
  const pixels = [];
  for (let n = 0; n < image.length; n += 1) {
    const m = mask[n];
    const bgrColour = palette[image[n]].first;
    const components = extractColourComponents(m, bgrColour);
    pixels.push(...components);
  }
  return {
    width,
    height,
    xDpi,
    yDpi,
    pixels,
  };
}

module.exports = {
  mapSprite,
};
