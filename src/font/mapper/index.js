/* eslint-disable no-bitwise */

const {
  OUTLINE_SEGMENT_CURVE,
  OUTLINE_SEGMENT_LINE,
  OUTLINE_SEGMENT_MOVE,
  OUTLINE_SEGMENT_TERMINATOR,
} = require('../constants');

const SVG_PATH_COMMANDS = {
  [OUTLINE_SEGMENT_TERMINATOR]: '',
  [OUTLINE_SEGMENT_MOVE]: 'M',
  [OUTLINE_SEGMENT_LINE]: 'L',
  [OUTLINE_SEGMENT_CURVE]: 'C',
};

function mapFillPath({ fillPath = [] }) {
  const definition = [];
  for (let i = 0; i < fillPath.length; i += 1) {
    const { type, coords } = fillPath[i];
    definition.push(SVG_PATH_COMMANDS[type]);
    definition.push(coords.join(','));
  }
  definition.push('Z');
  return definition.join('');
}

function mapCharacterOutline(character, transform) {
  return {
    tag: 'path',
    attributes: {
      'fill-rule': 'evenodd',
      d: mapFillPath(character),
      ...(transform && { transform }),
    },
  };
}

function mapCharacterOutlines(charCode, chunks) {
  function getCharacter(code) {
    const chunkNumber = code >> 5;
    const characterIndex = code & 0x1F;
    return chunks[chunkNumber]?.characters[characterIndex] ?? {};
  }

  const paths = [];
  const character = getCharacter(charCode);
  paths.push(mapCharacterOutline(character));
  const { composites = [] } = character;
  for (let i = 0; i < composites.length; i += 1) {
    const { code, offset: [dx, dy] } = composites[i];
    const compositeCharacter = getCharacter(code);
    const compositeTransform = `translate(${dx} ${dy})`;
    paths.push(mapCharacterOutline(compositeCharacter, compositeTransform));
  }
  return paths;
}

function mapCharacters(columns, rows, width, height, characters, chunks) {
  const groups = [];
  for (let charCode = 0; charCode < characters; charCode += 1) {
    const i = charCode % columns;
    const j = rows - Math.floor(charCode / columns) - 1;
    groups.push({
      tag: 'g',
      attributes: {
        transform: `translate(${i * width}, ${j * height})`,
      },
      children: mapCharacterOutlines(charCode, chunks),
    });
  }
  return groups;
}

function mapOutlines({ header: { boundingBox }, chunkCount, chunks }) {
  const { width, height } = boundingBox;
  const characters = chunkCount * 32;
  const columns = 16;
  const rows = characters / columns;
  const totalWidth = columns * width;
  const totalHeight = rows * height;

  return {
    tag: 'svg',
    attributes: {
      viewBox: `0 ${-totalHeight} ${totalWidth} ${totalHeight}`,
      xmlns: 'http://www.w3.org/2000/svg',
    },
    children: [{
      tag: 'g',
      attributes: {
        transform: 'scale(1, -1)',
      },
      children: mapCharacters(columns, rows, width, height, characters, chunks),
    }],
  };
}

module.exports = {
  mapOutlines,
};
