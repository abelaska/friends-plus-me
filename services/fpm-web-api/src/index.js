require("app-root-dir").set(__dirname);
require("babel-register");
require("./raven");
module.exports = require("./main");
