var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var argv = require('yargs').argv;
var browserify = require('browserify');
var babelify = require('babelify');
var watchify = require('watchify');
var source = require('vinyl-source-stream');
var nib = require('nib');
var buffer = require('vinyl-buffer');
var assemble = require('assemble');
var app = assemble();

gulp.task('stylus', function() {
  return gulp.src('src/css/main.styl')
    .pipe($.plumber())
    .pipe($.stylus({ use: nib() }))
    .pipe($.autoprefixer())
    .pipe($.if(argv.production, $.csso()))
    .pipe(gulp.dest('build/css'));
});

gulp.task('javascript', function() {
  return browserify({ entries: 'src/js/main.js', debug: true })
    .transform('babelify', { presets: ['es2015'] })
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe($.sourcemaps.init({ loadMaps: true }))
    .pipe($.if(argv.production, $.uglify()))
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('build/js'));
});

gulp.task('watchify', function() {
  var bundler = watchify(browserify({ entries: 'src/js/main.js', debug: true }, watchify.args));
  bundler.transform('babelify', { presets: ['es2015'] });
  bundler.on('update', rebundle);
  return rebundle();

  function rebundle() {
    var start = Date.now();
    return bundler.bundle()
      .on('error', function(err) {
        $.util.log($.util.colors.red(err.toString()));
      })
      .on('end', function() {
        $.util.log($.util.colors.green('Finished rebundling in', (Date.now() - start) + 'ms'));
      })
      .pipe(source('bundle.js'))
      .pipe(buffer())
      .pipe($.sourcemaps.init({ loadMaps: true }))
      .pipe($.sourcemaps.write('.'))
      .pipe(gulp.dest('build/js'));
  }
});

gulp.task('watch', function() {
  gulp.watch('src/css/**/*.styl', ['stylus']);
});

gulp.task('load', function(cb) {
  app.partials('src/views/partials/*.hbs');
  app.layouts('src/views/layouts/*.hbs');
  app.pages('src/views/pages/*.hbs');
  cb();
});

gulp.task('html', ['load'], function() {
  return app.toStream('src/views')
    .pipe(app.renderFile())
		.pipe($.extname())
    .pipe(app.dest('build/html'));
});

gulp.task('connect', function () {
  $.connect.server({
    root: 'build',
    port: 8000,
    livereload: true
  });
});

gulp.task('clean', function () {
	return del.sync('build');
});

gulp.task('build', ['stylus', 'javascript']);
gulp.task('default', ['clean', 'build', 'watch', 'watchify','html', 'connect']);
