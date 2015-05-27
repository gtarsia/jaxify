var esprima = require('esprima');
var escodegen = require('escodegen');

function jaxify(jaxiStr) {
    debugger;
    var ast = esprima.parse(jaxiStr);
    var body = ast.body;
    var bodyOut = [];
    body.forEach(function(el, index) {
        bodyOut.push(el);
    });
    var output = {
        type: "Program",
        body: bodyOut
    }
    return {
        client: '',
        server: ''
    }
}

module.exports = jaxify;
