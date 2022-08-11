const RiscOSError = require('./riscos-error');

function check(condition, message, data = {}) {
  if (!condition) {
    throw new RiscOSError(data, message);
  }
}

function fail(message, data = {}) {
  throw new RiscOSError(data, message);
}

function checkAlignment(view, message, data = {}) {
  check(view.getPosition() % 4 === 0, message, {
    position: view.getPosition(),
    ...data,
  });
}

module.exports = {
  check,
  fail,
  checkAlignment,
};
