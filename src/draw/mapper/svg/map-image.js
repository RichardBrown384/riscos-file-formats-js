const { Base64 } = require('riscos-support');

function mapImage(image, width, height, transform) {
  const data = Base64.fromUint8Array(image);
  return {
    tag: 'image',
    attributes: {
      x: 0,
      y: 0,
      width,
      height,
      preserveAspectRatio: 'none',
      'xlink:href': `data:image/png;base64,${data}`,
      transform: `matrix(${transform}) translate(0, ${height}) scale(1, -1)`,
    },
  };
}

module.exports = mapImage;
