const fs = require('fs');

const {
  SpriteArea,
  Sprite,
} = require('../src');

(function main() {
  const spriteFilename = process.argv[2];
  const data = fs.readFileSync(spriteFilename);
  const array = Uint8Array.from(data);
  const { sprites = [] } = SpriteArea.fromUint8Array(array);
  for (let i = 0; i < sprites.length; i += 1) {
    const sprite = sprites[i];
    const { png } = Sprite.Png.fromSprite(sprite);
    fs.writeFileSync(`sprite-${i}.png`, png);
  }
}());
