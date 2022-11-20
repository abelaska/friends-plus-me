/*jshint -W015*/
'use strict';

module.exports = grunt => {

  const path = require('path');
  const crypto = require('crypto');
  const fs = require('fs');

  grunt.registerMultiTask('rehash', 'Rehash in html linked file.', function() {
    const options = this.options({
      template: '${rev}.js'
    });

    this.files.forEach(f => {
      const src = f.src.length && (f.cwd && path.join(f.cwd, f.src[0]) || f.src[0]);
      const rev = crypto.createHash('md5').update(grunt.file.read(src)).digest('hex');
      const oldFilename = path.basename(src);
      const newFilename = options.template.replace('${rev}', rev);
      const newFile = path.join(path.dirname(src), newFilename);

      if (oldFilename === newFilename) {
        grunt.log.writeln('File '+(''+src).green+' hash is ok');
        return;
      }

      fs.renameSync(src, newFile);

      const html = grunt.file.read(f.dest);
      const newHtml = html.replace(new RegExp(oldFilename, 'g'), newFilename);

      grunt.file.write(f.dest, newHtml);

      grunt.log.writeln('Successfully rehashed '+src.green+' to '+newFile.green+' for '+f.dest);
    });
  });
}
