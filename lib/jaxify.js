var fs = require('fs');
var path = require('path');
var esprima = require('esprima');
var escodegen = require('escodegen');
var dust = require('dustjs-helpers');

function setExpress(app) {
    for (var name in ajax) {
        var action = ajax[name];
        var url = action.url ? action.url : '/' + name;
        app[action.method.toLowerCase()](url, function(req, res) {
            action.fn(req, res);
        });
    }
}

var boiler = {
    server: {
        setExpress: setExpress.toString()
    }
}

debugger;

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

var paramsTmpl = 
fs.readFileSync(path.resolve(__dirname, 'server-params.json'), "utf8");

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

var dustify = {
    client: function() {
        dust.renderSource(clientJquery, {actions: actions}, function(err, out) {
            client = out;
        })
        client = JSON.parse(client);
    },
    server: function() {
        dust.renderSource(serverExpress, {actions: actions}, function(err, out) {
            json = out;
        });
        ajax = JSON.parse(json);
        server.body.splice(ajaxPosition, 0, ajax.body[0]);
        dump(JSON.stringify(server));
    }
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
    function defineBodyVarInits(action) {
        dust.renderSource(paramsTmpl, 
            {params: action.urlParams, origin: 'params'}, function(err, out) {
            action.urlParamsAstJson = out;
        })
        dust.renderSource(paramsTmpl, 
            {params: action.bodyParams, origin: 'body'}, function(err, out) {
            action.bodyParamsAstJson = out;
        })
        //Add them, but remove the empty ones
        action.bodyJsons = [
            action.urlParamsAstJson,
            action.bodyParamsAstJson
        ].concat(action.fnAstJson).filter(Boolean);
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
                action.fnAstJson = prop.value.body.body.map(JSON.stringify);
            }
            if (key == 'method' || key == 'type') handleMethod()
            else if (key == 'url') handleUrl();
            else if (key == 'fn') handleFn();
        });
        debugger;
        defineBodyParams(action);
        defineBodyVarInits(action);
        defaultize(action);
        defineParametrizedUrl(action);
        //defineFnBodyJson(action);
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
    dustify.client();
    dustify.server();
    escodegenize.client();
    replace.parametrizedUrl();
    escodegenize.server();
    replace.replies();
    return {
        client: client,
        server: boiler.server.setExpress + '\n\n' + server + 
            '\n\nmodule.exports = setExpress;'
    }
}

module.exports = jaxify;
