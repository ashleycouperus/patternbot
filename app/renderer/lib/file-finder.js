'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const promisify = require('es6-promisify');
const subfiles = promisify(fs.readdir);
const fileExists = require(`${__dirname}/../../shared/file-exists`);

const appPkg = require(`${__dirname}/../../../package.json`);
const patternLibFilesDefaults = require(`${__dirname}/pattern-lib-files`);

let patternLibFiles = {};

const getIgnorableFolders = function () {
  let folders = [];

  if (patternLibFiles.commonParsable.modulifier) folders.push('modules');
  if (patternLibFiles.commonParsable.gridifier) folders.push('grid');
  if (patternLibFiles.commonParsable.typografier) folders.push('typography');
  if (patternLibFiles.commonParsable.theme) folders.push('brand');
  if (patternLibFiles.imagesParsable.icons) folders.push('icons');

  return folders;
};

const shouldIncludeDirectory = function (folderpath, file) {
  const ignorables = getIgnorableFolders();

  return (
    fs.statSync(path.join(folderpath, file)).isDirectory()
    && (ignorables.length < 1 || ignorables.indexOf(file) < 0)
  );
};

const findParseableFile = function (folderpath, filepath, patternLibKey) {
  return new Promise(function (resolve, reject) {
    const keys = patternLibKey.split(/\./);

    patternLibFiles[keys[0]][keys[1]] = (fileExists.check(folderpath + filepath)) ? folderpath + filepath : false;
    resolve()
  });
};

const findLogos = function (folderpath, imagesFolder) {
  return new Promise(function (resolve, reject) {
    glob(`${folderpath}${imagesFolder}/?(logo|logo-256|logo-64|logo-32|logo-16).svg`, function (err, logos) {
      if (err) return resolve();

      patternLibFiles.logos = logos;
      resolve();
    });
  });
};

const findSubDirectories = function (folderpath, subdir, patternLibKey) {
  return new Promise(function (resolve, reject) {
    subfiles(folderpath + subdir)
      .then(function (foundFiles) {
        let subdirs = foundFiles.filter(function (file) {
          return shouldIncludeDirectory(folderpath + subdir, file);
        });

        patternLibFiles[patternLibKey] = patternLibFiles[patternLibKey].concat(patternLibFiles[patternLibKey], subdirs.map(function (dir) {
          return path.resolve(`${folderpath}${subdir}/${dir}`);
        }));

        resolve();
      })
      .catch(resolve)
    ;
  });
};

const find = function (folderpath) {
  patternLibFiles = Object.assign({}, patternLibFilesDefaults);

  return new Promise(function (resolve, reject) {
    Promise.all([
      findParseableFile(folderpath, `${appPkg.config.commonFolder}/${appPkg.config.commonParsableFilenames.modulifier}`, 'commonParsable.modulifier'),
      findParseableFile(folderpath, `${appPkg.config.commonFolder}/${appPkg.config.commonParsableFilenames.gridifier}`, 'commonParsable.gridifier'),
      findParseableFile(folderpath, `${appPkg.config.commonFolder}/${appPkg.config.commonParsableFilenames.typografier}`, 'commonParsable.typografier'),
      findParseableFile(folderpath, `${appPkg.config.commonFolder}/${appPkg.config.commonParsableFilenames.theme}`, 'commonParsable.theme'),
      findParseableFile(folderpath, `${appPkg.config.imagesFolder}/${appPkg.config.imagesParsableFilenames.icons}`, 'imagesParsable.icons'),
    ]).then(function () {
      Promise.all([
        findLogos(folderpath, appPkg.config.imagesFolder),
        findSubDirectories(folderpath, appPkg.config.patternsFolder, 'patterns'),
        findSubDirectories(folderpath, appPkg.config.pagesFolder, 'pages'),
      ]).then(function () {
        resolve(patternLibFiles);
      });
    });
  });
};

module.exports = {
  find: find,
};
