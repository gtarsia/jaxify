var jaxify = require('../')
   ,fs = require('fs')
   ,path = require('path');
var argv = require('minimist')(process.argv.slice(2), {
    alias: {
        'i': 'inputfile',
        'c': 'clientfile',
        's': 'serverfile',
        'w': 'webserver',
        'a': 'ajax',
        'h': 'help'
    },
    default: {
        'i': 'jaxi.js',
        'c': 'client.jaxi.js',
        's': 'server.jaxi.js',
        'w': 'express',
        'a': 'jquery'
    }
});

var usage = fs.readFileSync(
    path.resolve(__dirname, 'usage.txt'), 'utf8');
var help = function(msg) {
    console.log(msg);
    console.log('');
    console.log(usage);
}

var ajaxLibs = ['jquery', 'superagent'];
var webServers = ['express', 'hapi'];

if (argv.h) return help();
if (ajaxLibs.indexOf(argv.a) < 0) 
    return help('The ajax library can only be one of the following: \n' +
                ajaxLibs.join(' '));
if (webServers.indexOf(argv.w) < 0)
    return help('The webserver can only be one of the following: \n' +
                webServers.join(' '));

fs.readFile(argv.inputfile, 'utf8', function (err,data) {
  if (err) return console.log(err);
  var output = jaxify(data);
  fs.writeFile(argv.clientfile, output.client, function() {

  });
  fs.writeFile(argv.serverfile, output.server, function() {

  })
});
