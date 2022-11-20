/* eslint no-unused-vars: "off", no-multi-assign: "off" */
const Promise = require("bluebird");
const fs = require("fs");
const log = require("@fpm/logging").default;

const readdir = Promise.promisify(fs.readdir);
const stat = Promise.promisify(fs.stat);

const functionsDir = `${__dirname}/../functions`;
const functions = {};

const scanPath = async (path = "") => {
  const dir = `${functionsDir}${path ? `/${path}` : path}`;

  const scan = (await readdir(dir))
    .filter((name) => name !== "__tests__")
    .map((name) => ({
      name: `${path ? `${path}/` : ""}${name}`,
      filename: `${functionsDir}/${path}${path ? "/" : ""}${name}`,
    }));

  const list = await Promise.map(scan, async (f) => ({
    ...f,
    stat: await stat(f.filename),
  }));

  // eslint-disable-next-line array-callback-return
  list
    .filter((f) => f.stat.isFile() && /^.*\.js$/.test(f.name))
    .map((f) => {
      // eslint-disable-next-line  global-require, import/no-dynamic-require
      functions[f.name.replace(/^(.*)\.js$/, "$1")] = require(f.filename);
    });

  await Promise.map(
    list.filter((f) => f.stat.isDirectory()),
    async (f) => scanPath(f.name)
  );
};

const loadFunctions = (module.exports.loadFunctions = () => {
  scanPath()
    .then(() =>
      log.info(
        `Detected functions(${Object.keys(functions).length}): ${Object.keys(
          functions
        ).join(", ")}`
      )
    )
    .catch((error) => {
      log.error("Failed to scan functions", {
        stack: error.stack,
        error,
      });
      process.exit(-1);
    });
});

const findFunction = (module.exports.findFunction = (name) => {
  return functions[name];
});
