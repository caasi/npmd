#!/usr/bin/env node

var MapReduce      = require('map-reduce')

var opts           = require('optimist').argv
var levelup        = require('levelup')
var sublevel       = require('level-sublevel')

var path           = require('path')

var config = require('rc')('npmd', {
  path: path.join(process.env.HOME, '.npmd'),
  debug: true,
  sync: false,
  registry: 'http://isaacs.iriscouch.com/registry'
})

module.exports = function (path, sync) {
  var db = (
    'string' === typeof path
    ? sublevel(levelup(path, {encoding: 'json'}), '~')
    : path //allow user to inject db
  )
  var packageDb = db.sublevel('pkg')
  var versionDb = db.sublevel('ver')

  require('./plugins/couch-sync')     (db, config)
  require('./plugins/inverted-index') (db, config)
  require('./plugins/authors')        (db, config)

  return db
}

if(!module.parent) {
  var db = module.exports(path.join(process.env.HOME, '.npmd'))

  if(opts._.length) {
    if(opts.query)
      return db.sublevel('index').query(opts._)
        .on('data', console.log)
    db.sublevel('index').createQueryStream(opts._)
      .on('data', console.log)
  }


  if(opts.authors && opts.init) {
    db.sublevel('authors').start()
  }

  else if(opts.authors) {
    var range = []
    if(opts.authors == true)
      range = [true]
    else 
      range = [opts.authors]

    db.sublevel('authors').createReadStream({range: range, tail: opts.tail})
    .on('data', console.log)
  }

  if(opts.count) {
    db.sublevel('authors').createReadStream({range: [], tail: opts.tail})
    .on('data', console.log)
  }
}

