const { dbConnect } = require("@fpm/db");
const { httpFunction, httpLogger, enhanceStatusCode } = require("./utils/http");
const { loadFunctions } = require("./utils/functions");
const { loadValidations } = require("./utils/validations");
const { initDeps } = require("./utils/deps");

dbConnect();
loadFunctions();
loadValidations();

const deps = initDeps();

module.exports = httpLogger(enhanceStatusCode(httpFunction({ deps })));
