const Constants = require('../../constants');
const { extractBitField } = require('../../../common/bitwise');

const FILL = 'fill';
const FILL_RULE = 'fill-rule';
const STROKE = 'stroke';
const STROKE_WIDTH = 'stroke-width';
const STROKE_LINECAP = 'stroke-linecap';
const STROKE_LINEJOIN = 'stroke-linejoin';
const STROKE_DASHOFFSET = 'stroke-dashoffset';
const STROKE_DASHARRAY = 'stroke-dasharray';
const VECTOR_EFFECT = 'vector-effect';

const JOIN_MAP = {
  [Constants.JOIN_MITRE]: 'miter',
  [Constants.JOIN_ROUND]: 'round',
  [Constants.JOIN_BEVEL]: 'bevel',
};

const CAP_MAP = {
  [Constants.CAP_BUTT]: 'butt',
  [Constants.CAP_ROUND]: 'round',
  [Constants.CAP_SQUARE]: 'square',
  [Constants.CAP_TRIANGLE]: 'triangle',
};

const WINDING_RULE_MAP = {
  [Constants.WINDING_RULE_NON_ZERO]: 'nonzero',
  [Constants.WINDING_RULE_EVEN_ODD]: 'evenodd',
};

function mapColour(colour) {
  if (colour === 0xFFFFFFFF) {
    return 'none';
  }
  const elements = [
    extractBitField(colour, 8, 8),
    extractBitField(colour, 16, 8),
    extractBitField(colour, 24, 8),
  ];
  return `rgb(${elements})`;
}

function mapFill(colour) {
  return { [FILL]: mapColour(colour) };
}

function mapStroke(colour) {
  return { [STROKE]: mapColour(colour) };
}

function mapStrokeWidth(strokeWidth) {
  if (strokeWidth !== 0) {
    return { [STROKE_WIDTH]: strokeWidth };
  }
  return {
    // I would have thought 1px would be correct, but Chrome produces thicker
    // lines than are perhaps desirable
    [STROKE_WIDTH]: '0.5px',
    [VECTOR_EFFECT]: 'non-scaling-stroke',
  };
}

function mapJoin(join) {
  return join !== Constants.JOIN_MITRE && { [STROKE_LINEJOIN]: JOIN_MAP[join] };
}

function mapCapStart(capStart) {
  return capStart in [Constants.CAP_SQUARE, Constants.CAP_ROUND]
        && { [STROKE_LINECAP]: CAP_MAP[capStart] };
}

function mapWindingRule(windingRule) {
  return windingRule === Constants.WINDING_RULE_EVEN_ODD
      && { [FILL_RULE]: WINDING_RULE_MAP[windingRule] };
}

function mapStrokeDashoffset({ offset = 0 }) {
  return offset && { [STROKE_DASHOFFSET]: offset };
}

function mapStrokeDashArray({ array = [] }) {
  return array.length && { [STROKE_DASHARRAY]: array };
}

function mapPathAttributes(attributes) {
  const {
    fillColour,
    outlineColour,
    outlineWidth,
    pathStyle: {
      join,
      capStart,
      windingRule,
      dash = {},
    },
  } = attributes;
  return {
    ...mapFill(fillColour),
    ...mapStroke(outlineColour),
    ...mapStrokeWidth(outlineWidth),
    ...mapJoin(join),
    ...mapCapStart(capStart),
    ...mapWindingRule(windingRule),
    ...mapStrokeDashoffset(dash),
    ...mapStrokeDashArray(dash),
  };
}

module.exports = mapPathAttributes;
