class MergingBoundingBox {
  constructor({
    minX, minY, maxX, maxY,
  }) {
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
  }

  merge(other) {
    if (!other) return;
    const {
      minX, maxX, minY, maxY,
    } = other;
    if ((minX >= maxX) || (minY >= maxY)) {
      return;
    }
    this.minX = Math.min(this.minX, minX);
    this.minY = Math.min(this.minY, minY);
    this.maxX = Math.max(this.maxX, maxX);
    this.maxY = Math.max(this.maxY, maxY);
  }
}

module.exports = MergingBoundingBox;
