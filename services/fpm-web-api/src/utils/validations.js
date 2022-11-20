/* eslint no-unused-vars: "off", no-multi-assign: "off" */
const Promise = require("bluebird");
const urlParser = require("url");
const fs = require("fs");
const log = require("@fpm/logging").default;
const Ajv = require("ajv");

const readdir = Promise.promisify(fs.readdir);
const stat = Promise.promisify(fs.stat);
const { validateTimezone } = require("./scheduling");
const { createError } = require("./error");

const schemasDir = `${__dirname}/../schemas`;
const validations = {};

const ajv = new Ajv({ allErrors: true, $data: true });

require("ajv-keywords")(ajv);

ajv.addFormat("timezone", (tz) => !!validateTimezone(tz));
ajv.addFormat("time-hour-minute", (time) => {
  const split = time.split(":");
  if (split.length !== 2 || isNaN(split[0]) || isNaN(split[1])) {
    return false;
  }
  const hour = parseInt(split[0], 10);
  const min = parseInt(split[1], 10);
  return hour >= 0 && hour < 24 && min >= 0 && min < 60;
});
ajv.addFormat("callback-url", (url) => {
  const u = urlParser.parse(url.toLowerCase(), true);
  return ["http:", "https:"].indexOf(u.protocol) !== -1 && !u.hash && !u.search;
});
// ajv.addKeyword('restrictToHttpSchemes', {
//   type: 'string',
//   compile: (isRestrictEnabled, parentSchema) => {
//     const httpRegEx = /^[hH][tT][tT][pP][sS]?:\/\//;
//     return url => isRestrictEnabled ? !url || httpRegEx.test(url) : true;
//   },
//   metaSchema: {
//     type: 'boolean'
//   }
// });

const schema = (module.exports.schema = {
  URL: {
    type: "string",
    format: "url",
  },
  CallbackURL: {
    type: "string",
    format: "callback-url",
  },
});

const addValidation = (module.exports.addValidation = (name, validation) => {
  // eslint-disable-next-line array-callback-return, global-require, import/no-dynamic-require
  validations[name.replace(/^(.*)\.js$/, "$1")] = ajv.compile(validation);
});

const scanPath = async (path = "") => {
  const dir = `${schemasDir}${path ? `/${path}` : path}`;

  const scan = (await readdir(dir))
    .filter((name) => name !== "__tests__")
    .map((name) => ({
      name: `${path ? `${path}/` : ""}${name}`,
      filename: `${schemasDir}/${path}${path ? "/" : ""}${name}`,
    }));

  const list = await Promise.map(scan, async (f) => ({
    ...f,
    stat: await stat(f.filename),
  }));

  // eslint-disable-next-line array-callback-return
  list
    .filter((f) => f.stat.isFile() && /^.*\.js$/.test(f.name))
    .map((f) => {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      addValidation(f.name, require(f.filename));
    });

  await Promise.map(
    list.filter((f) => f.stat.isDirectory()),
    async (f) => scanPath(f.name)
  );
};

const loadValidations = (module.exports.loadValidations = () =>
  scanPath()
    .then(() =>
      log.info(
        `Detected validations(${
          Object.keys(validations).length
        }): ${Object.keys(validations).join(", ")}`
      )
    )
    .catch((error) => {
      log.error("Failed to scan validation schemas", {
        stack: error.stack,
        error,
      });
      process.exit(-1);
    }));

const validationErrorMessage = ({ error, dataVar }) => {
  const msg = `${dataVar}${error.dataPath} ${error.message}`;
  switch (error.keyword) {
    case "enum":
      return `${msg} [${(error.params.allowedValues || []).join(",")}]`;
    case "format":
      switch (error.params.format) {
        case "callback-url":
          return `${msg} only http and https protocols are allowed, hash and query part of the URL is not allowed`;
        case "timezone":
          return `${msg} column TZ https://en.wikipedia.org/wiki/List_of_tz_database_time_zones`;
        case "time-hour-minute":
          return `${msg} time-hour ":" time-minute https://tools.ietf.org/html/rfc3339#section-5.6`;
        default:
          return msg;
      }
    default:
      return msg;
  }
};

const validationErrorsMessage = (
  errors = [],
  { dataVar = "body", separator = ", " } = {}
) => {
  return errors
    .filter((e) => e)
    .map((error) => validationErrorMessage({ error, dataVar }))
    .join(separator);
};

const validateBody = (module.exports.validateBody = ({ name } = {}) => async (
  req,
  res,
  next
) => {
  const validator = validations[name || req.function.name];
  if (!validator) {
    throw new Error(`Validator for function '${req.function.name}' not found`);
  }
  if (validator(req.body)) {
    return next();
  }
  return createError(
    "invalid_request",
    validationErrorsMessage(validator.errors)
  );
});
