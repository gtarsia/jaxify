var esprima = require('esprima');
var escodegen = require('escodegen');


function parse(jaxiStr) {
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
}

module.exports = {parse: parse};
