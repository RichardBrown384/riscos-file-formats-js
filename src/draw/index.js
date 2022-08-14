const RiscOSView = require('../common/riscos-view');

const Constants = require('./constants');
const { readDraw, isDrawHeaderPresent } = require('./serialisation/read');
const { mapDraw } = require('./mapper');

module.exports = {
  Draw: {
    Constants,
    isHeaderPresent(array) {
      const view = new RiscOSView(array.buffer);
      return isDrawHeaderPresent(view);
    },
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
