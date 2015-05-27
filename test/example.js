var example = require('../');

describe('example', function(){
  describe('#truth()', function(){
    it('should return the Boolean value true', function(){
      example.truth().should.be.true;
    })
  })
})
