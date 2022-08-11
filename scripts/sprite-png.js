const fs = require('fs');

const {
  Png,
} = require('riscos-support');
const {
  SpriteArea,
  Sprite,
} = require('../src');

(function main() {
  const spriteFilename = process.argv[2];
  const data = fs.readFileSync(spriteFilename);
  const array = Uint8Array.from(data);
  const spriteArea = SpriteArea.fromUint8Array(array);
  const { sprites = [] } = spriteArea;
  for (let i = 0; i < sprites.length; i += 1) {
    const sprite = sprites[i];
    const rgbaImage = Sprite.RGBAImage.fromSprite(sprite);
    const png = Png.fromRGBAImage(rgbaImage);
    fs.writeFileSync(`sprite-${i}.png`, png);
  }
}());
