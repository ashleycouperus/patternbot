'use strict';

const fs = require('fs');
const path = require('path');
const fontColorContrast = require('font-color-contrast');

const readmeParser = require(`${__dirname}/readme-parser`);
const optimizedAssetsReader = require(`${__dirname}/optimized-assets-reader`);
const templateHelper = require(`${__dirname}/template-helper`);
const cssCommonParser = require(`${__dirname}/css-common-parser`);
const builtInHelper = require(`${__dirname}/pattern-builtin-helper`);
const patternParserQueue = require(`${__dirname}/pattern-parser-queue`);
const patternRenderer = require(`${__dirname}/pattern-renderer`);
const iconParser = require(`${__dirname}/icon-parser`);
const hexFullLength = require(`${__dirname}/hex-full-length`);

const env = process.env.NODE_ENV;
const DEBUG = !!(env === 'development');

let appPkg = require(`${__dirname}/../../../package.json`);

const getDefaultPatterLibInfo = function (patternLibFiles) {
  return {
    patterns: [],
  };
};

const renderPatternLib = function (patternLibFiles, patternLibInfo, commonInfo) {
  return templateHelper.render('pattern-library.html', {
    files: patternLibFiles,
    patterns: patternLibInfo.patterns,
    common: commonInfo,
  });
};

const savePatternLib = function (folderpath, patternLibString) {
  fs.writeFileSync(`${folderpath}/${appPkg.config.patternLibFilename}`, patternLibString);
};

const generate = function (folderpath, patternLibFiles) {
  return new Promise(function (resolve, reject) {
    Promise.all([readmeParser.parse(folderpath)]).then((readmes) => {
      let readme = readmes[0];

      Promise.all([cssCommonParser.parseAll(patternLibFiles, readme)]).then((commonInfos) => {
        let commonInfo = commonInfos[0];

        Promise.all([
          optimizedAssetsReader.readAll(),
          patternParserQueue.parseAllBuiltins('brand'),
          patternParserQueue.parseAllBuiltins('typography'),
          patternParserQueue.parseAllBuiltins('grid'),
          patternParserQueue.parseAllBuiltins('modules', commonInfo.modulifier),
          iconParser.parseAll(patternLibFiles.imagesParsable.icons),
          patternParserQueue.parseAllBuiltins('icons'),
          patternParserQueue.parseAll(patternLibFiles.patterns),
        ]).then(function (all) {
          let patternLibInfo = getDefaultPatterLibInfo(patternLibFiles);

          if (DEBUG) console.log(commonInfo);
          if (DEBUG) console.log(patternLibFiles);

          let assets = all[0];
          let brandPatterns = all[1];
          let typePatterns = all[2];
          let gridPatterns = all[3];
          let modulePatterns = all[4];
          let icons = all[5];
          let iconsPatterns = all[6];
          let userPatterns = all[7];

          if (readme) commonInfo.readme = readme;
          if (assets) commonInfo.assets = assets;
          if (icons) commonInfo.icons = icons;

          if (fontColorContrast(hexFullLength(readme.attributes.backgroundColour)) === '#000000') {
            commonInfo.interfaceColours = {
              primary: 0,
              opposite: 255,
            };
          } else {
            commonInfo.interfaceColours = {
              primary: 255,
              opposite: 0,
            };
          }

          if (commonInfo.theme && brandPatterns.length && patternLibFiles.commonParsable.theme) {
            patternLibInfo.patterns = patternLibInfo.patterns.concat(patternRenderer.renderAll(brandPatterns, {hideCode: true, hideNav: true}));
            builtInHelper.copy(folderpath, 'brand', patternLibFiles, commonInfo);
          }

          if (commonInfo.typografier && typePatterns.length && typePatterns[0].html.length && patternLibFiles.commonParsable.typografier) {
            patternLibInfo.patterns = patternLibInfo.patterns.concat(patternRenderer.renderAll(typePatterns, {hideCode: true, hideNav: true}));
            builtInHelper.copy(folderpath, 'typography', patternLibFiles, commonInfo);
          }

          if (commonInfo.gridifier && gridPatterns.length && gridPatterns[0].html.length && patternLibFiles.commonParsable.gridifier) {
            patternLibInfo.patterns = patternLibInfo.patterns.concat(patternRenderer.renderAll(gridPatterns, {hideCode: true, hideNav: true}));
            builtInHelper.copy(folderpath, 'grid', patternLibFiles, commonInfo);
          }

          if (commonInfo.modulifier && modulePatterns.length && modulePatterns[0].html.length && patternLibFiles.commonParsable.modulifier) {
            patternLibInfo.patterns = patternLibInfo.patterns.concat(patternRenderer.renderAll(modulePatterns, {hideNav: true}));
            builtInHelper.copy(folderpath, 'modules', patternLibFiles, commonInfo, commonInfo.modulifier);
          }

          if (icons.length && iconsPatterns.length && iconsPatterns[0].html.length && patternLibFiles.imagesParsable.icons) {
            patternLibInfo.patterns = patternLibInfo.patterns.concat(patternRenderer.renderAll(iconsPatterns, {hideNav: true}));
            builtInHelper.copy(folderpath, 'icons', patternLibFiles, commonInfo);
          }

          if (userPatterns.length) patternLibInfo.patterns = patternLibInfo.patterns.concat(patternRenderer.renderAll(userPatterns));

          savePatternLib(folderpath, renderPatternLib(patternLibFiles, patternLibInfo, commonInfo));
          resolve();
        });
      });
    });
  });
};

module.exports = {
  generate: generate,
};
