const path = require("path");
const fs = require("fs");

const iconCache = new Map();
const ICON_CACHE_MAX = 10000;

module.exports = function defaultIconClass(filePath) {
  const cached = iconCache.get(filePath);
  if (cached) return cached;

  const ext = path.extname(filePath).toLowerCase();
  let result;

  try {
    const lstat = fs.lstatSync(filePath);
    if (lstat.isDirectory()) {
      result = lstat.isSymbolicLink()
        ? ["icon-file-symlink-directory"]
        : ["icon-file-directory"];
    } else if (lstat.isSymbolicLink()) {
      result = ["icon-file-symlink-file"];
    } else if (
      path.basename(filePath, ext).toLowerCase() === "readme" &&
      (ext === "" || ext in MARKDOWN_EXTENSIONS)
    ) {
      result = ["icon-book"];
    } else if (ext in COMPRESSED_EXTENSIONS) {
      result = ["icon-file-zip"];
    } else if (ext in IMAGE_EXTENSIONS) {
      result = ["icon-file-media"];
    } else if (ext === ".pdf") {
      result = ["icon-file-pdf"];
    } else if (ext in BINARY_EXTENSIONS) {
      result = ["icon-file-binary"];
    } else {
      result = ["icon-file-text"];
    }
  } catch {
    result = ["icon-file-text"];
  }

  if (iconCache.size >= ICON_CACHE_MAX) {
    iconCache.delete(iconCache.keys().next().value);
  }
  iconCache.set(filePath, result);
  return result;
};

const MARKDOWN_EXTENSIONS = {
  ".markdown": 1,
  ".md": 1,
  ".mdown": 1,
  ".mkd": 1,
  ".mkdown": 1,
  ".rmd": 1,
  ".ron": 1,
};
const COMPRESSED_EXTENSIONS = {
  ".bz2": 1,
  ".egg": 1,
  ".epub": 1,
  ".gem": 1,
  ".gz": 1,
  ".jar": 1,
  ".lz": 1,
  ".lzma": 1,
  ".lzo": 1,
  ".rar": 1,
  ".tar": 1,
  ".tgz": 1,
  ".war": 1,
  ".whl": 1,
  ".xpi": 1,
  ".xz": 1,
  ".z": 1,
  ".zip": 1,
};
const IMAGE_EXTENSIONS = {
  ".gif": 1,
  ".ico": 1,
  ".jpeg": 1,
  ".jpg": 1,
  ".png": 1,
  ".tif": 1,
  ".tiff": 1,
  ".webp": 1,
};
const BINARY_EXTENSIONS = {
  ".ds_store": 1,
  ".a": 1,
  ".exe": 1,
  ".o": 1,
  ".pyc": 1,
  ".pyo": 1,
  ".so": 1,
  ".woff": 1,
};
