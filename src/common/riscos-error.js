class RiscOSError extends Error {
  constructor(data, ...options) {
    super(...options);
    this.name = 'RiscOSError';
    this.data = data;
  }
}

module.exports = RiscOSError;
