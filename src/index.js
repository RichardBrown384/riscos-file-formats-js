const Draw = require('./draw');
const Sprite = require('./sprite');
const Font = require('./font');

module.exports = {
  ...Draw,
  ...Sprite,
  ...Font,
};
