'use strict';

function CustomReporter() {
  if (!(this instanceof CustomReporter)) {
    return new CustomReporter();
  }
}

module.exports = CustomReporter;

CustomReporter.prototype.start = function () {
  return '';
};

CustomReporter.prototype.test = function (test) {
  return '';
};

CustomReporter.prototype.unhandledError = function (err) {
  return '';
};

CustomReporter.prototype.finish = function () {
  return 'custom output';
};

CustomReporter.prototype.write = function (str) {
  console.error(str);
};

CustomReporter.prototype.stdout = CustomReporter.prototype.stderr = function (data) {
  process.stderr.write(data);
};
