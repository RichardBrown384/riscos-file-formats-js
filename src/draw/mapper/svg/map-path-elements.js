const Constants = require('../../constants');

const TAG_MAP = {
  [Constants.PATH_TAG_END]: '',
  [Constants.PATH_TAG_MOVE]: 'M',
  [Constants.PATH_TAG_CLOSE_SUB_PATH]: 'Z',
  [Constants.PATH_TAG_BEZIER]: 'C',
  [Constants.PATH_TAG_LINE]: 'L',
};

function mapPathElements(elements) {
  const path = [];
  for (let i = 0; i < elements.length; i += 1) {
    const { tag, points = [] } = elements[i];
    path.push(TAG_MAP[tag]);
    path.push(points.flatMap(({ x, y }) => [x, y]).join(','));
  }
  return path.join('');
}

module.exports = mapPathElements;
