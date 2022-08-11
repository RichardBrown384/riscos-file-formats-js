const fs = require('fs');

const {
  Xml,
} = require('riscos-support');
const {
  Draw,
} = require('../src');

(function main() {
  const drawFilename = process.argv[2];
  const svgFilename = process.argv[3];
  const data = fs.readFileSync(drawFilename);
  const array = Uint8Array.from(data);
  const draw = Draw.fromUint8Array(array);
  const svg = Xml.fromElement(Draw.SVGElement.fromDraw(draw, array));
  fs.writeFileSync(svgFilename, svg);
}());
