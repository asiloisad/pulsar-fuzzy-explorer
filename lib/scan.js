const { globSync } = require("glob");

module.exports = function (pattern) {
  emit(
    "entries",
    globSync(pattern, {
      silent: true,
      nosort: true,
      dot: true,
      nodir: false,
      absolute: true,
    })
  );
};
