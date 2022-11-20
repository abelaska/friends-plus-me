'use strict';

process.env.NODE_ENV = 'test';

var _dir = __dirname+'/../src/',
    expect = require('chai').expect,
    Types = require(_dir+'lib/Types'),
    Publisher = require(_dir+'lib/Publisher');

describe('Publisher', function(){

  this.timeout(60000);

  require('chai').config.includeStack = true;

  it('should detect non shotenable urls', function() {
    var pub = new Publisher('', null, null, null, null, null, {});

    expect(pub._isUrlNotShortenable('http://www.cz')).to.be.false;
    expect(pub._isUrlNotShortenable('https://www.youtube.nl/playlist?list=PLJKX_lNv-G5CrpfJLUNEve7vCg64cVNT6')).to.be.false;
    expect(pub._isUrlNotShortenable('https://www.youtube.com/playlist?list=PLJKX_lNv-G5CrpfJLUNEve7vCg64cVNT6')).to.be.false;
    expect(pub._isUrlNotShortenable('https://www.youtube.com.br/playlist?list=PLJKX_lNv-G5CrpfJLUNEve7vCg64cVNT6')).to.be.false;
    expect(pub._isUrlNotShortenable('https://www.youtube.nl/watch?v=KEi_QBZiVOc')).to.be.true;
    expect(pub._isUrlNotShortenable('https://www.youtube.com/watch?v=KEi_QBZiVOc')).to.be.true;
    expect(pub._isUrlNotShortenable('https://www.youtube.com.br/watch?v=KEi_QBZiVOc')).to.be.true;
    expect(pub._isUrlNotShortenable('https://www.youtube.nl/embed/DR_wX0EwOMM?list=PLJKX_lNv-G5CrpfJLUNEve7vCg64cVNT6')).to.be.true;
    expect(pub._isUrlNotShortenable('https://www.youtube.com/embed/DR_wX0EwOMM?list=PLJKX_lNv-G5CrpfJLUNEve7vCg64cVNT6')).to.be.true;
    expect(pub._isUrlNotShortenable('https://www.youtube.com.br/embed/DR_wX0EwOMM?list=PLJKX_lNv-G5CrpfJLUNEve7vCg64cVNT6')).to.be.true;
    expect(pub._isUrlNotShortenable('https://youtu.be/KEi_QBZiVOc')).to.be.true;
  });
});