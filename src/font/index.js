const Constants = require('./constants');
const { readMetrics } = require('./serialisation/read-metrics');
const { readOutlines } = require('./serialisation/read-outlines');
const { mapOutlines } = require('./mapper');

module.exports = {
  Font: {
    Constants,
  },
  FontMetrics: {
    fromUint8Array(array) {
      return readMetrics(array.buffer);
    },
  },
  FontOutlines: {
    fromUint8Array(array) {
      return readOutlines(array.buffer);
    },
    SVGElement: {
      fromOutlines(outlines) {
        return mapOutlines(outlines);
      },
    },
  },
};
