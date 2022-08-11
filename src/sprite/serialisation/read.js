/* eslint-disable no-bitwise */

const Constants = require('../constants');

const { check, checkAlignment } = require('../../common/checks');

const SPRITE_PALETTE_OFFSET = 44;

function readSpriteControlBlock(view) {
  checkAlignment(view, 'misaligned sprite control block');
  return {
    spriteOffset: view.readUint32(),
    spriteName: view.readStringFully(12),
    wordWidth: view.readUint32(),
    lineHeight: view.readUint32(),
    firstBitUsed: view.readUint32(),
    lastBitUsed: view.readUint32(),
    imageOffset: view.readUint32(),
    maskOffset: view.readUint32(),
    mode: view.readUint32(),
  };
}

function extractPixels(data, bits, bitsPerPixel) {
  check(bits > 0, 'negative number of bits in word', { bits });
  check(
    bits % bitsPerPixel === 0,
    'non integral number of pixels in sprite word',
    { bits, bitsPerPixel },
  );
  const mask = (1 << bitsPerPixel) - 1;
  const pixels = [];
  for (let n = 0, d = data; n < bits / bitsPerPixel; n += 1) {
    pixels.push(d & mask);
    d >>= bitsPerPixel;
  }
  return pixels;
}

function readSpriteImageRow(
  view,
  { wordWidth, firstBitUsed, lastBitUsed },
  extract,
) {
  if (wordWidth === 0) {
    extract(view.readUint32() >> firstBitUsed, 1 + lastBitUsed - firstBitUsed);
  } else {
    extract(view.readUint32() >> firstBitUsed, 32 - firstBitUsed);
    for (let n = 0; n < wordWidth - 1; n += 1) {
      extract(view.readUint32(), 32);
    }
    extract(view.readUint32(), 1 + lastBitUsed);
  }
}

function readSpriteImage(
  view,
  controlBlock,
  bitsPerPixel,
  pixelHeight,
) {
  checkAlignment(view, 'misaligned sprite image');
  const image = [];
  function extract(data, bits) {
    image.push(...extractPixels(data, bits, bitsPerPixel));
  }
  for (let y = 0; y < pixelHeight; y += 1) {
    readSpriteImageRow(view, controlBlock, extract);
  }
  return image;
}

function readSpritePaletteArea(view, { imageOffset }) {
  checkAlignment(view, 'misaligned sprite palette');
  const count = (imageOffset - SPRITE_PALETTE_OFFSET) / 8;
  if (count !== 0) {
    const palette = [];
    for (let n = 0; n < count; n += 1) {
      palette.push({
        first: view.readUint32(),
        second: view.readUint32(),
      });
    }
    return palette;
  }
  return null;
}

function readSprite(view) {
  checkAlignment(view, 'misaligned sprite');
  const spritePosition = view.getPosition();
  const controlBlock = readSpriteControlBlock(view);
  const {
    wordWidth,
    lineHeight,
    firstBitUsed,
    lastBitUsed,
    imageOffset,
    maskOffset,
    mode,
  } = controlBlock;

  const modeProperties = Constants.SPRITE_MODE_PROPERTIES_MAP[mode];
  check(modeProperties, 'unsupported sprite screen mode', { mode });

  const { bitsPerPixel } = modeProperties;
  const bitsPerLine = 32 * wordWidth + 1 + lastBitUsed - firstBitUsed;
  const pixelWidth = bitsPerLine / bitsPerPixel;
  const pixelHeight = lineHeight + 1;
  check(
    bitsPerLine % bitsPerPixel === 0,
    'non integral number of pixels per line',
    {
      mode, bitsPerPixel, bitsPerLine, pixelWidth,
    },
  );
  check(pixelWidth > 0, 'zero or negative sprite width');
  check(pixelHeight > 0, 'zero or negative sprite height');

  view.setPosition(spritePosition + SPRITE_PALETTE_OFFSET);
  const palette = readSpritePaletteArea(view, controlBlock);
  const wimpPalette = Constants.SPRITE_BITS_PER_PIXEL_PALETTE_MAP[bitsPerPixel];
  check(
    bitsPerPixel > 8 || palette || wimpPalette,
    'palette undefined for indexed screen mode',
    { mode },
  );

  view.setPosition(spritePosition + imageOffset);
  const image = readSpriteImage(view, controlBlock, bitsPerPixel, pixelHeight);

  let mask;
  if (maskOffset !== imageOffset) {
    view.setPosition(spritePosition + maskOffset);
    mask = readSpriteImage(view, controlBlock, bitsPerPixel, pixelHeight);
  }

  return {
    controlBlock,
    ...modeProperties,
    pixelWidth,
    pixelHeight,
    image,
    ...(mask && { mask }),
    ...(palette && { palette }),
    ...(wimpPalette && { wimpPalette }),
  };
}

function readControlBlock(view) {
  return {
    spriteCount: view.readUint32(),
    spriteOffset: view.readUint32(),
    freeOffset: view.readUint32(),
  };
}

function readSpriteArea(view) {
  const controlBlock = readControlBlock(view);
  const {
    spriteCount,
    spriteOffset,
  } = controlBlock;
  const sprites = [];
  for (let n = 0, spritePosition = spriteOffset - 4; n < spriteCount; n += 1) {
    view.setPosition(spritePosition);
    const sprite = readSprite(view);
    sprites.push(sprite);
    spritePosition += sprite.controlBlock.spriteOffset;
  }
  return {
    controlBlock,
    sprites,
  };
}

module.exports = {
  readSprite,
  readSpriteArea,
};
