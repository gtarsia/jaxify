var fs = require('fs');
var path = require('path');
var esprima = require('esprima');
var escodegen = require('escodegen');
var mustache = require('mustache');

function dump(str) {
    fs.writeFileSync(path.resolve(__dirname, '_dump'), str);
}

var clientJquery = 
fs.readFileSync(path.resolve(__dirname, 'client-jquery.json'), "utf8");

var valid = {
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}

function err(msg) { throw new Error(msg); }

var actions = [];

var client;
var server = { type: 'Program', body: [] };

function replaceParametrizedUrl() {
    actions.forEach(function(action) {
        var re = new RegExp('\'\\|' + action.name + '.parametrizedUrl' + '\\|\'');
        client = client.replace(re, action.parametrizedUrl);
    });
}
function generateClient() {
    client = mustache.render(clientJquery, {actions: actions});
    //dump(client);
    client = JSON.parse(client);
}
function translateClient() {
    client = escodegen.generate(client);
}
function generateServer() {
}

function lastize() {
    actions[actions.length - 1].last = true;
    actions.forEach(function(action) {
        var length = action.params.length;
        if (length > 0) action.params[length - 1].last = true;
        length = action.bodyParams.length;
        if (length > 0) action.bodyParams[length - 1].last = true;
    })
}

String.prototype.splice = function( idx, rem, s ) {
    return (this.slice(0,idx) + s + this.slice(idx + Math.abs(rem)));
};

function jaxify(jaxiStr) {
    var ast = esprima.parse(jaxiStr);
    var re = /:(\w+)/g;
    function defineBodyParams(action) {
        action.params.forEach(function(param) {
            if (action.urlParams.indexOf(param.name) < 0)
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
                    action.urlParams.push(match[1]);
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
            handleAjaxVar(el);
        }
        else server.body.push(el);
    });
    if (!ajaxVarFound) err('No ajax var was defined at top scope');
    lastize();
    generateClient();
    translateClient();
    replaceParametrizedUrl();
    return {
        client: client,
        server: escodegen.generate(server)
    }
}

module.exports = jaxify;
