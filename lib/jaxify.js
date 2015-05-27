var esprima = require('esprima');
var escodegen = require('escodegen');

function traverse(node, func) {
    func(node);//1
    for (var key in node) { //2
        if (node.hasOwnProperty(key)) { //3
            var child = node[key];
            if (typeof child === 'object' && child !== null) { //4
                if (Array.isArray(child)) {
                    child.forEach(function(node) { //5
                        traverse(node, func);
                    });
                } else {
                    traverse(child, func); //6
                }
            }
        }
    }
}

function jaxify(jaxiStr) {
    var ast = esprima.parse(jaxiStr);
    var ajaxVarFound = false;
    var client = { type: 'Program', body: [] }; 
    var server = { type: 'Program', body: [] }; 
    function handleAjaxVar(tree) {
        server.body.push(tree);
    }
    ast.body.forEach(function(el, index) {
        debugger;
        if (el.type == 'VariableDeclaration'
        && el.declarations[0].id.name == 'ajax') {
                ajaxVarFound = true;
                handleAjaxVar(el);
        }
        else server.body.push(el);
    });
    if (!ajaxVarFound) throw new Error('No ajax var was defined at top scope');
    return {
        client: escodegen.generate(client),
        server: escodegen.generate(server)
    }
}

module.exports = jaxify;
