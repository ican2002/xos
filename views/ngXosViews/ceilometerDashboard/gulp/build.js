'use strict';

// BUILD
//
// The only purpose of this gulpfile is to build a XOS view and copy the correct files into
// .html => dashboards
// .js (minified and concat) => static/js
//
// The template are parsed and added to js with angular $templateCache

var gulp = require('gulp');
var ngAnnotate = require('gulp-ng-annotate');
var uglify = require('gulp-uglify');
var templateCache = require('gulp-angular-templatecache');
var runSequence = require('run-sequence');
var concat = require('gulp-concat-util');
var del = require('del');
var wiredep = require('wiredep');
var angularFilesort = require('gulp-angular-filesort');
var _ = require('lodash');
var eslint = require('gulp-eslint');
var inject = require('gulp-inject');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var mqpacker = require('css-mqpacker');
var csswring = require('csswring');
var yaml = require('js-yaml');
var colors = require('colors/safe');
var fs =  require('fs');

const TEMPLATE_FOOTER = `
angular.module('xos.ceilometerDashboard')
.run(['$location', function(a){
  a.path('/');
}])
`

module.exports = function(options){
  
  // delete previous builded file
  gulp.task('clean', function(){
    return del(
      [
        options.dashboards + 'xosCeilometerDashboard.html',
        options.static + 'css/xosCeilometerDashboard.css',
        options.static + 'images/ceilometerDashboard-icon.png',
        options.static + 'images/ceilometerDashboard-icon-active.png'
      ],
      {force: true}
    );
  });

  // minify css
  gulp.task('css', function () {
    var processors = [
      autoprefixer({browsers: ['last 1 version']}),
      mqpacker,
      csswring
    ];

    gulp.src([
      `${options.css}**/*.css`,
      `!${options.css}dev.css`
    ])
    .pipe(postcss(processors))
    .pipe(gulp.dest(options.tmp + '/css/'));
  });

  // copy css in correct folder
  gulp.task('copyCss', ['wait'], function(){
    return gulp.src([`${options.tmp}/css/*.css`])
    .pipe(concat('xosCeilometerDashboard.css'))
    .pipe(gulp.dest(options.static + 'css/'))
  });

  // copy images in correct folder
  gulp.task('copyImages', ['wait'], function(){
    return gulp.src([`${options.icon}/ceilometerDashboard-icon.png`, `${options.icon}/ceilometerDashboard-icon-active.png`])
    .pipe(gulp.dest(options.static + 'images/'))
  });

  // compile and minify scripts
  gulp.task('scripts', function() {
    return gulp.src([
      options.tmp + '**/*.js'
    ])
    .pipe(ngAnnotate())
    .pipe(angularFilesort())
    .pipe(concat('xosCeilometerDashboard.js'))
    .pipe(concat.header('//Autogenerated, do not edit!!!\n'))
    .pipe(concat.footer(TEMPLATE_FOOTER))
    .pipe(uglify())
    .pipe(gulp.dest(options.static + 'js/'));
  });

  // set templates in cache
  gulp.task('templates', function(){
    return gulp.src('./src/templates/*.html')
      .pipe(templateCache({
        module: 'xos.ceilometerDashboard',
        root: 'templates/'
      }))
      .pipe(gulp.dest(options.tmp));
  });

  // copy html index to Django Folder
  gulp.task('copyHtml', function(){
    return gulp.src(options.src + 'index.html')
      // remove dev dependencies from html
      .pipe(replace(/<!-- bower:css -->(\n^<link.*)*\n<!-- endbower -->/gmi, ''))
      .pipe(replace(/<!-- bower:js -->(\n^<script.*)*\n<!-- endbower -->/gmi, ''))
      // injecting minified files
      .pipe(
        inject(
          gulp.src([
            options.static + 'vendor/xosCeilometerDashboardVendor.js',
            options.static + 'js/xosCeilometerDashboard.js',
            options.static + 'css/xosCeilometerDashboard.css'
          ]),
          {ignorePath: '/../../../xos/core/xoslib'}
        )
      )
      .pipe(rename('xosCeilometerDashboard.html'))
      .pipe(gulp.dest(options.dashboards));
  });

  // minify vendor js files
  gulp.task('wiredep', function(){
    var bowerDeps = wiredep().js;
    if(!bowerDeps){
      return;
    }

    // remove angular (it's already loaded)
    _.remove(bowerDeps, function(dep){
      return dep.indexOf('angular/angular.js') !== -1;
    });

    return gulp.src(bowerDeps)
      .pipe(concat('xosCeilometerDashboardVendor.js'))
      .pipe(uglify())
      .pipe(gulp.dest(options.static + 'vendor/'));
  });

  gulp.task('lint', function () {
    return gulp.src(['src/js/**/*.js'])
      .pipe(eslint())
      .pipe(eslint.format())
      .pipe(eslint.failAfterError());
  });

  gulp.task('wait', function (cb) {
    // setTimeout could be any async task
    setTimeout(function () {
      cb();
    }, 1000);
  });

  gulp.task('tosca', function (cb) {

    // TOSCA to register the dashboard in the system
    const dashboardJson = {};
    dashboardJson['CeilometerDashboard'] = {
      type: 'tosca.nodes.DashboardView',
      properties: {
        url: 'template:xosCeilometerDashboard'
      }
    };

    // check for custom icons
    if(
      fs.existsSync(`${options.icon}/ceilometerDashboard-icon.png`) &&
      fs.existsSync(`${options.icon}/ceilometerDashboard-icon-active.png`)
    ){
      dashboardJson['CeilometerDashboard'].properties.custom_icon = true;
    }

    const dashboardTosca = yaml.dump(dashboardJson).replace(/'/gmi, '');

    // TOSCA to add the dashboard to the user
    const userDashboardJson = {};
    userDashboardJson['ceilometerDashboard_dashboard'] = {
      node: 'CeilometerDashboard',
      relationship: 'tosca.relationships.UsesDashboard'
    };
    const userJson = {
      'padmin@vicci.org': {
        type: 'tosca.nodes.User',
        properties: {
          'no-create': true,
          'no-delete': true
        },
        requirements: [userDashboardJson]
      }
    };
    const userTosca = yaml.dump(userJson).replace(/'/gmi, '');


    // the output is in a timeout so that it get printed after the gulp logs
    setTimeout(function () {
      console.log(colors.cyan('\n\n# You can use this recipe to load the dashboard in the system:'));
      console.log(colors.yellow(dashboardTosca));
      console.log(colors.cyan('# And this recipe to activate the dashboard for a user:'));
      console.log(colors.yellow(userTosca));
    }, 1000);
    cb();
  });

  gulp.task('build', function() {
    runSequence(
      'clean',
      'sass',
      'templates',
      'babel',
      'scripts',
      'wiredep',
      'css',
      'copyCss',
      'copyImages',
      'copyHtml',
      'cleanTmp',
      'tosca'
    );
  });
};