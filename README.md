[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/erandros/jaxify?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

# jaxify

Generate client and server side ajax calls code.

# why

* Code less. In the README.md example, I wrote an input file of 16 lines, and got two necessary files with a sum of around 30.  
* It forces the developer to use the promise returned from `$.ajax` instead of `success`, `error` and `complete` properties. This is better because promises make code more readable.  
* When you change something (ie: the url), you only have to modify one codebase. This is also true because of the previous point, ajax calls are meant to be defined once client side.  
* It automatically maps parameters of `fn` that are in the url (like id in `/find/:id`) to `req.params`. And, the parameters of `fn`that are not in the url are mapped to `req.body`. No confusion between `req.params` and `req.body`. And because of this, client ajax methods can be called with simple code, for example: `ajax.find(1, false)` even if the first parameter is a url parameter, and the other is mapped to `data`.

# how

1) Write a `jaxi.js` file like this:
```javascript
var ajax = {
    find: {
        method: 'get',
        url: '/find/:id',
        fn: function(id, filter) {
            if (filter) reply('James');
            reply(['Jimmy', 'James', 'Found'][id]);
        }
    },
    delete: {
        method: 'delete',
        fn: function() {
            reply('Deleted');
        }
    }
}
```

2) Run `jaxify` in a terminal to generate a `client.jaxi.js` and a `server.jaxi.js`

3) Look at the magic:  

`client.jaxi.js`
```javascript
var ajax = {
    find: function(id, filter) {
        return $.ajax({
            url: '/find/' + id,
            method: 'get',
            data: {filter: filter}
        })
    },
    delete: function() {
        return $.ajax({
            url: '/delete',
            method: 'delete'
        })
    }
}
// $.ajax returns a jqXHR, that implements the promise interface, so you can do 
ajax.find(1, false).done(function(res) { });
```  

`server.jaxi.js`
```javascript

function setExpress(app) {
    for (var name in ajax) {
        var action = ajax[name];
        var url = action.url ? action.url : '/' + name;
        app[action.method](url, function(req, res) {
            action.fn(req, res);
        });
    }
}

var ajax = {
    find: {
        method: 'get',
        url: '/find/:id',
        fn: function(req, res) {
            var id = req.params.id;
            var filter = req.body.filter;
            if (filter) res.send('James')
			res.send(['Jimmy', 'James', 'Found'][id]);
        }
    },
    delete: {
        method: 'delete',
        fn: function(req, res) {
            res.send('Deleted');
        }
    }
}
module.exports = setExpress;
```

4) Add `client.jaxi.js`as a script to HTML.  
5) Require `server.jaxi.js` in server and invoke with Express, for example:
```javascript
var app = require('express')();
require('server.jaxi')(app);
```

# install

With [npm](http://npmjs.org) do:

```
npm install -g jaxify
```

# usage

```
Usage: jaxify {OPTIONS}

Standard Options:

    --clientfile, -c  Write the client output to this file.
                      If unspecified, use 'client.jaxi.js'
		      
    --serverfile, -s  Write the server output to this file.
                      If unspecified, use 'server.jaxi.js'

     --inputfile, -i  Use this file as input.
                      If unspecified, use 'jaxi.js'
    		     
     --webserver, -w  Use the specified webserver.
                      Options are 'express'.

          --ajax, -a  Use the specified client side ajax library.
                      Options are 'jquery'.

          --help, -h  Show this message
```

# license

MIT
