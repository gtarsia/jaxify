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
function generateClient() {
    client = mustache.render(clientJquery, {actions: actions});
    dump(client);
    client = JSON.parse(client);
}
function generateServer() {
}

function lastize() {
    actions[action.length - 1].last = true;
    actions.forEach(function(action) {
        var length = action.params.length;
        if (length > 0) action.params[length - 1].last = true;
        length = action.bodyParams.length;
        if (length > 0) action.bodyParams[length - 1].last = true;
    })
}

function jaxify(jaxiStr) {
    var ast = esprima.parse(jaxiStr);
    function defaultize(action) {
        if (!action.method) action.method = 'GET';
        if (!action.url) action.url = '/' + action.name; 
        if (!action.params) action.params = [];
    }
    function handleAjaxAction(actionAst) {
        var action = {
            name: actionAst.key.name
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
                action.urlParams = [];
                var re = /:(\w+)/g;
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
                    return el.name;
                });
            }
            if (key == 'method' || key == 'type') handleMethod()
            else if (key == 'url') handleUrl();
            else if (key == 'fn') handleFn();
        });
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
    debugger;
    generateClient();
    debugger;
    return {
        client: escodegen.generate(client),
        server: escodegen.generate(server)
    }
}

module.exports = jaxify;
