/*jshint -W015*/
'use strict';

module.exports = function(grunt) {
  process.env.DEBUG_LOG = true;

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  require('./html2js')(grunt);
  require('./rehash')(grunt);

  grunt.initConfig({
    // Project settings
    cfg: {
      // configurable paths
      app: 'public',
      views: 'views',
      dist: 'dist',
      distViews: 'dist/views',
      distPublic: 'dist/public'
    },

    watch: {
      web: {
        files: ['src/**/*.js', 'conf/*'],
        tasks: ['express:web'],
        options: {
          livereload: 35733,
          spawn: false,
          atBegin: true
        }
      },
      js: {
        files: ['<%= cfg.app %>/scripts/{,*/}*.js'],
        //tasks: ['jshint:all'],
        options: {
          livereload: 35735
        }
      },
      // jsTest: {
      //   files: ['test/spec/{,*/}*.js'],
      //   tasks: ['jshint:test']
      // },
      less: {
        files: ['<%= cfg.app %>/styles/**/*.less'],
        tasks: ['less:server']
      },
      gruntfile: {
        files: ['Gruntfile.js']
      },
      index: {
        options: {
          livereload: 35735
        },
        files: ['<%= cfg.app %>/template/index.html'],
        tasks: ['preprocess:server']
      },
      share: {
        options: {
          livereload: 35735
        },
        files: ['<%= cfg.app %>/template/share.html'],
        tasks: ['preprocess:serverShare']
      },
      livereload: {
        options: {
          livereload: 35735
        },
        files: [
          '<%= cfg.app %>/{,*/}*.html',
          '<%= cfg.app %>/template/{,**/}*.html',
          '<%= cfg.app %>/styles/{,*/}*.css',
          '<%= cfg.app %>/images/{,**/}*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      }
    },

    clean: {
      dist: {
        files: [
          {
            dot: true,
            src: ['.tmp', '<%= cfg.dist %>', '<%= cfg.views %>/index.html', '<%= cfg.views %>/share.html']
          }
        ]
      },
      distCompilation: {
        files: [
          {
            expand: true,
            cwd: '<%= cfg.dist %>',
            src: [
              'conf/*-development*',
              'conf/*-test*',
              'conf/localhost.pem',
              'src/*.json',
              'src/tools',
              'node_modules/chai',
              'node_modules/node-gyp',
              'node_modules/mocha',
              'node_modules/json3',
              'node_modules/es5-shim',
              'node_modules/*grunt*',
              'node_modules/karma*',
              'node_modules/gifsicle',
              'node_modules/optipng-bin',
              'node_modules/pngquant-bin',
              'node_modules/jpegtran-bin',
              'node_modules/matchdep',
              'node_modules/jshint-stylish'
            ]
          }
        ]
      },
      server: '.tmp'
    },

    preprocess: {
      server: {
        src: '<%= cfg.app %>/template/index.html',
        dest: '<%= cfg.views %>/index.html',
        options: {
          context: {
            ENV: 'development'
          }
        }
      },
      serverShare: {
        src: '<%= cfg.app %>/template/share.html',
        dest: '<%= cfg.views %>/share.html',
        options: {
          context: {
            ENV: 'development'
          }
        }
      },
      dist: {
        src: '<%= cfg.app %>/template/index.html',
        dest: '<%= cfg.distViews %>/index.html',
        options: {
          context: {
            ENV: process.env.NODE_ENV
          }
        }
      },
      distShare: {
        src: '<%= cfg.app %>/template/share.html',
        dest: '<%= cfg.distViews %>/share.html',
        options: {
          context: {
            ENV: process.env.NODE_ENV
          }
        }
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc'
        //reporter: require('jshint-stylish')
      },
      all: ['Gruntfile.js', '<%= cfg.app %>/scripts/{,**/}*.js', '!<%= cfg.app %>/scripts/vendors/{,**/}*.js']
    },

    less: {
      options: {
        paths: ['<%= cfg.app %>/components', '<%= cfg.app %>/styles']
        //dumpLineNumbers: true
      },
      dist: {
        files: [
          {
            expand: true, // Enable dynamic expansion.
            cwd: '<%= cfg.app %>/styles/', // Src matches are relative to this path.
            src: ['main.less', 'main-vendor.less', 'share.less', 'share-vendor.less', 'tinymce-content.less'], // Actual pattern(s) to match.
            dest: '<%= cfg.app %>/styles/', // Destination path prefix.
            ext: '.css' // Dest filepaths will have this extension.
          }
        ]
      },
      server: {
        files: [
          {
            expand: true, // Enable dynamic expansion.
            cwd: '<%= cfg.app %>/styles/', // Src matches are relative to this path.
            src: ['main.less', 'main-vendor.less', 'share.less', 'share-vendor.less', 'tinymce-content.less'], // Actual pattern(s) to match.
            dest: '<%= cfg.app %>/styles/', // Destination path prefix.
            ext: '.css' // Dest filepaths will have this extension.
          }
        ]
      }
    },

    useminPrepare: {
      dist: {
        src: ['<%= cfg.distViews %>/index.html', '<%= cfg.distViews %>/share.html']
      },
      options: {
        dest: '<%= cfg.distPublic %>'
      }
    },

    uglify: {
      options: {
        // mangle: false,
        // compress: false
        compress: {
          unused: false
        }
      }
    },

    usemin: {
      html: ['<%= cfg.distPublic %>/{,**/}*.html', '<%= cfg.distViews %>/{,**/}*.html'],
      css: ['<%= cfg.distPublic %>/styles/{,*/}*.css'],
      options: {
        assetsDirs: ['<%= cfg.app %>', '<%= cfg.distPublic %>']
      }
    },

    cssmin: {
      dist: {
        files: {
          '<%= cfg.distPublic %>/styles/tinymce-content.css': ['<%= cfg.app %>/styles/tinymce-content.css']
          //          '<%= cfg.dist %>/styles/main.css': [
          //            '.tmp/styles/{,*/}*.css',
          //            '<%= cfg.app %>/styles/{,*/}*.css'
          //          ]
        }
      }
    },

    //    cssmin: {
    //      dist: {
    //        files: {
    //          '<%= cfg.dist %>/styles/main.css': [
    //            '.tmp/styles/{,*/}*.css',
    //            '<%= cfg.app %>/styles/{,*/}*.css'
    //          ]
    //        }
    //      }
    //    },

    htmlmin: {
      dist: {
        options: {
          maxLineLength: 100,
          removeComments: true,
          collapseWhitespace: true,
          collapseBooleanAttributes: true,
          removeCommentsFromCDATA: true,
          removeOptionalTags: false // !!! nedavat na true jinak nepujde doplnit window.user skript do index.html
          // https://github.com/cfg/grunt-usemin/issues/44
        },
        files: [
          {
            expand: true,
            cwd: '<%= cfg.dist %>',
            dest: '<%= cfg.dist %>',
            src: ['public/{,**/}*.html', 'views/{,**/}*.html']
          }
        ]
      }
    },

    ngAnnotate: {
      dist: {
        files: [
          {
            expand: true,
            cwd: '.tmp/concat/scripts',
            src: '*.js',
            dest: '.tmp/concat/scripts'
          }
        ]
      }
    },

    rev: {
      options: {
        algorithm: 'sha1',
        length: 40
      },
      dist: {
        files: {
          src: [
            '<%= cfg.distPublic %>/scripts/{,*/}*.js',
            '<%= cfg.distPublic %>/styles/{,*/}*.css',
            '<%= cfg.distPublic %>/images/{,**/}*.{ico,png,jpg,jpeg,gif,webp}',
            '<%= cfg.distPublic %>/styles/fonts/*',
            '!<%= cfg.distPublic %>/styles/tinymce-content.css'
          ]
        }
      }
    },

    html2js: {
      dist: {
        options: {
          dest: '<%= cfg.distPublic %>/scripts/*.scripts.js'
        },
        cwd: '<%= cfg.distPublic %>',
        src: ['views/{,**/}*.html']
      },
      distShare: {
        options: {
          dest: '<%= cfg.distPublic %>/scripts/*.share.js'
        },
        cwd: '<%= cfg.distPublic %>',
        src: [
          'views/share.html',
          'views/editor.html',
          'views/dialogs/DateTimePicker.html',
          'views/dialogs/PremiumRequired.html',
          'views/dialogs/PickLinkShortener.html',
          'views/dialogs/PickGoogleCommunityCategory.html'
        ]
      }
    },

    express: {
      options: {
        // Override defaults here
        /*jshint -W106*/
        node_env: process.env.NODE_ENV === 'production' ? 'development' : process.env.NODE_ENV,
        port: 9000
      },
      web: {
        options: {
          script: 'src/app.js',
          opts: []
        }
      }
    },

    copy: {
      dist: {
        files: [
          {
            expand: true,
            dot: true,
            cwd: '<%= cfg.app %>',
            dest: '<%= cfg.distPublic %>',
            src: [
              '*.{ico,txt,html,xml,json,ico,png,jpg,jpeg,gif,webp,svg}',
              '.htaccess',
              '.well-known/**/*',
              'views/{,**/}*.html',
              'images/{,**/}*.{webp,svg}',
              'styles/fonts/**/*'
            ]
          },
          {
            expand: true,
            dot: true,
            cwd: '<%= cfg.app %>/components/bootstrap',
            dest: '<%= cfg.distPublic %>/styles',
            src: ['fonts/{,*/}*.*']
          },
          // {
          //   expand: true,
          //   dot: true,
          //   dest: '<%= cfg.dist %>',
          //   src: ['conf/**/*', 'node_modules/**/*', 'src/**/*', 'templates/**/*', 'views/**/*', 'package.json']
          // },
          {
            expand: true,
            dot: true,
            cwd: '<%= cfg.app %>/images',
            src: '{,**/}*.{png,jpg,jpeg,gif,svg}',
            dest: '<%= cfg.distPublic %>/images'
          }
        ]
      }
    },

    rehash: {
      index: {
        options: {
          template: '${rev}.scripts.js'
        },
        cwd: '<%= cfg.distPublic %>',
        src: 'scripts/*.scripts.js',
        dest: '<%= cfg.dist %>/views/index.html'
      },
      share: {
        options: {
          template: '${rev}.share.js'
        },
        cwd: '<%= cfg.distPublic %>',
        src: 'scripts/*.share.js',
        dest: '<%= cfg.dist %>/views/share.html'
      }
    }
  });

  grunt.registerTask('serve', function(target) {
    if (target === 'dist') {
      return grunt.task.run(['build']);
    }

    grunt.task.run([
      'clean:server',
      'less:server',
      'preprocess:server',
      'preprocess:serverShare',
      'watch',
      'express:web'
    ]);
  });

  grunt.registerTask('server', function() {
    grunt.log.warn('The `server` task has been deprecated. Use `grunt serve` to start a server.');
    grunt.task.run(['serve']);
  });

  grunt.registerTask('test', ['clean:server', 'less']);

  grunt.registerTask('build', [
    'clean:dist',
    'less:dist',
    'preprocess:dist',
    'preprocess:distShare',
    'useminPrepare',
    'concat',
    'ngAnnotate',
    'copy:dist',
    'cssmin',
    'uglify',
    'rev',
    'usemin',
    'htmlmin',
    'html2js',
    'rehash',
    'clean:distCompilation'
  ]);

  grunt.registerTask('default', ['build']);
};
