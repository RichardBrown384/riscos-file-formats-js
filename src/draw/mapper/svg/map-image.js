function mapImage(image, width, height, transform) {
  return {
    tag: 'image',
    attributes: {
      x: 0,
      y: 0,
      width,
      height,
      preserveAspectRatio: 'none',
      'xlink:href': `data:image/png;base64,${image}`,
      transform: `matrix(${transform}) translate(0, ${height}) scale(1, -1)`,
    },
  };
}

module.exports = mapImage;
