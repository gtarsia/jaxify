var fs = require('fs');
var path = require('path');
var esprima = require('esprima');
var escodegen = require('escodegen');
var mustache = require('mustache');

Array.prototype.hasProperty = function(searchTerm, property) {
    var array = this;
    var length = array.length;
    for(var i = 0, len = length; i < len; i++) {
        if (array[i][property] === searchTerm) return i;
    }
    return -1;
}

function dump(str) {
    fs.writeFileSync(path.resolve(__dirname, '_dump'), str);
}

var clientJquery = 
fs.readFileSync(path.resolve(__dirname, 'client-jquery.json'), "utf8");

var serverExpress =
fs.readFileSync(path.resolve(__dirname, 'server-express.json'), "utf8");

var valid = {
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}

function err(msg) { throw new Error(msg); }

var actions = [];
var client;
var server = { type: 'Program', body: [] };
var ajaxPosition = 0;

var replace = {
    parametrizedUrl: function() {
        actions.forEach(function(action) {
            var re = new RegExp('\'\\|' + action.name + '.parametrizedUrl' + '\\|\'');
            client = client.replace(re, action.parametrizedUrl);
        });
    },
    replies: function() {
        server = server.replace(/reply\(([\s\S]*?)\)/g, 'res.send($1)');
    }
}

var escodegenize = {
    client: function() {
        client = escodegen.generate(client);
    },
    server: function() {
        server = escodegen.generate(server);
    }
}

var mustachify = {
    client: function() {
        client = mustache.render(clientJquery, {actions: actions});
        client = JSON.parse(client);
    },
    server: function() {
        var json = mustache.render(serverExpress, {actions: actions});
        dump(json);
        ajax = JSON.parse(json);
        server.body.splice(ajaxPosition, 0, ajax.body[0]);
    }
}

function lastize() {
    actions[actions.length - 1].last = true;
    actions.forEach(function(action) {
        var length = action.params.length;
        if (length > 0) action.params[length - 1].last = true;
        length = action.bodyParams.length;
        if (length > 0) action.bodyParams[length - 1].last = true;
        length = action.urlParams.length;
        if (length > 0) action.urlParams[length - 1].last = true;
    })
}

function jaxify(jaxiStr) {
    var ast = esprima.parse(jaxiStr);
    var re = /:(\w+)/g;
    function defineBodyParams(action) {
        action.params.forEach(function(param) {
            if (action.urlParams.hasProperty(param.name, 'name') < 0)
                action.bodyParams.push({
                    name: param.name
                })
        });
    }
    function defineParametrizedUrl(action) {
        var parametrizedUrl = 
        action.url.replace(re, function(m, p1) { return '|' + p1 + '|' });
        parametrizedUrl = "'" + parametrizedUrl + "'";
        var open = true;
        while ( (result = /\|/.exec(parametrizedUrl)) ) {
            parametrizedUrl =
            parametrizedUrl.replace(/\|/, function(m, offset) { 
                return (open ? "' + " : " + '");
            })
            open = !open;
        }
        action.parametrizedUrl = parametrizedUrl;
    }
    function defaultize(action) {
        if (!action.method) action.method = 'GET';
        if (!action.url) action.url = '/' + action.name; 
        if (!action.params) action.params = [];
    }
    function handleAjaxAction(actionAst) {
        var action = {
            name: actionAst.key.name,
            bodyParams: [],
            params: [],
            urlParams: [],
            url: ''
        };
        actionAst.value.properties.forEach(function(prop) {
            var key = prop.key.name;
            var val = prop.value.value;
            function handleMethod() {
                val = val.toUpperCase();
                if (valid.methods.indexOf(val) < 0) 
                    err('invalid method ' + val);
                if (action.method)
                    err('method was already set');
                else action.method = val;
            }
            function handleUrl() {
                if (action.url) err('url was already set');
                action.url = val;
                var match = re.exec(val);
                while (match != null) {
                    action.urlParams.push({name: match[1]});
                    match = re.exec(val);
                }
                action.parametrizedUrl = "";
            }
            function handleFn() {
                key; val; prop;
                var params = prop.value.params;
                action.params = params.map(function(el) {
                    return {name: el.name}
                });
            }
            if (key == 'method' || key == 'type') handleMethod()
            else if (key == 'url') handleUrl();
            else if (key == 'fn') handleFn();
        });
        defineBodyParams(action);
        defineParametrizedUrl(action);
        defaultize(action);
        actions.push(action);
    }
    function handleAjaxVar(varAst) {
        varAst.declarations[0].init.properties.forEach(handleAjaxAction);
    }
    var ajaxVarFound = false;
    ast.body.forEach(function(el, index) {
        if (el.type == 'VariableDeclaration'
        && el.declarations[0].id.name == 'ajax') {
            ajaxVarFound = true;
            ajaxPosition = index;
            handleAjaxVar(el);
        }
        else server.body.push(el);
    });
    if (!ajaxVarFound) err('No ajax var was defined at top scope');
    lastize();
    mustachify.client();
    mustachify.server();
    escodegenize.client();
    replace.parametrizedUrl();
    escodegenize.server();
    replace.replies();
    return {
        client: client,
        server: server
    }
}

module.exports = jaxify;
