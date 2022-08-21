const mapPathElements = require('./map-path-elements');
const mapPathAttributes = require('./map-path-attributes');

function mapPath(path, attributes, data = {}) {
  return {
    tag: 'path',
    attributes: {
      d: mapPathElements(path),
      ...mapPathAttributes(attributes),
    },
    ...(data && {
      children: [{
        tag: 'desc',
        text: JSON.stringify(data),
      }],
    }),
  };
}

module.exports = mapPath;
