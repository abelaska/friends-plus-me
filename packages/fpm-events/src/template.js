// @flow
const fs = require('fs');
const templateCompiler = require('lodash.template');

const templateCache = {};

const compileTemplate = templateName => {
  const template = templateCompiler(
    fs.readFileSync(`${__dirname}/../template/${templateName}.html`, { encoding: 'utf8' })
  );
  templateCache[templateName] = template;
  return template;
};

export const renderEmail = (templateName: string, context: Object = {}) => {
  const template = templateCache[templateName] || compileTemplate(templateName);
  return template(context);
};
