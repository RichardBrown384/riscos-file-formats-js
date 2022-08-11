const RiscOSView = require('../common/riscos-view');

const Constants = require('./constants');
const { readDraw } = require('./serialisation/read');
const { mapDraw } = require('./mapper');

module.exports = {
  Draw: {
    Constants,
    fromUint8Array(array) {
      const view = new RiscOSView(array.buffer);
      return readDraw(view);
    },
    SVGElement: {
      fromDraw(draw, array) {
        return mapDraw(draw, array);
      },
    },
  },
};
