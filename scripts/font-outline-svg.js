const fs = require('fs');

const {
  Xml,
} = require('riscos-support');
const {
  FontOutlines,
} = require('../src');

(function main() {
  const outlineFilename = process.argv[2];
  const svgFilename = process.argv[3];
  const data = fs.readFileSync(outlineFilename);
  const array = Uint8Array.from(data);
  const outlines = FontOutlines.fromUint8Array(array);
  const svg = Xml.fromElement(FontOutlines.SVGElement.fromOutlines(outlines));
  fs.writeFileSync(svgFilename, svg);
}());
