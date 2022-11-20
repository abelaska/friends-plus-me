/*jshint -W015*/
'use strict';

module.exports = grunt => {

	const path = require('path');

	const escapeContent = (content, quoteChar, indentString) => {
    var bsRegexp = new RegExp('\\\\', 'g');
    var quoteRegexp = new RegExp('\\' + quoteChar, 'g');
    var nlReplace = '\\n' + quoteChar + ' +\n' + indentString + indentString + quoteChar;
    return content.replace(bsRegexp, '\\\\').replace(quoteRegexp, '\\' + quoteChar).replace(/\r?\n/g, nlReplace);
  };

	const compileTemplate = (templateName, filename, quoteChar, indentString) => {
    var content = escapeContent(grunt.file.read(filename), quoteChar, indentString);
    return '$templateCache.put(\''+templateName+'\',\''+content+'\');';
  };

	grunt.registerMultiTask('html2js', 'Compiles Angular-JS templates to JavaScript.', function() {
		const options = this.options({
      module: 'fpmApp',
      quoteChar: '\'',
      indentString: '',
      prefix: '/',
      //cwd: 'dist'
      //src: 'dist/views/{,**/}*.html',
      //dest: 'dist/scripts/*.scripts.js'
    });

    let files = 0;

		this.files.forEach(f => {
      files += f.src.length;

			const modules = f.src.map(moduleName => compileTemplate(options.prefix+moduleName, path.join(f.cwd, moduleName), options.quoteChar, options.indentString)).join('');
      const dest = grunt.file.expand(options.dest)[0] || options.dest;
      const html = dest && grunt.file.exists(dest) && grunt.file.read(dest) || '';
      const content = `${html}angular.module('${options.module}').run(['$templateCache',function($templateCache){${modules}}]);`;

      grunt.file.write(dest, content);
		});

		grunt.log.writeln('Successfully converted '+(''+files).green+' html template(s) to js.');
	});
}
