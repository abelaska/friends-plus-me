'use strict';

process.env.NODE_ENV = 'test';

var expect = require('chai').expect,
    image = require(__dirname+'/../src/lib/image');

describe('image', function() {

  require('chai').config.includeStack = true;

  it('should fetch image', function(done) {
    image.fetchImageFile('https://lh6.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAAAGeI/HPBfsRDsAno/photo.jpg?sz=50', function(err, buffer, contentType, tm) {
      expect(err).to.be.undefined;
      expect(buffer).to.be.ok;
      expect(buffer.length).to.be.gt(0);
      expect(contentType).to.eq('image/jpeg');
      expect(tm).to.be.gt(0);
      done();
    });
  });

  it('should fetch image after redirect', function(done) {
    this.timeout(5000);
    image.fetchImageFile('https://www.caminodesantiago.me/community/camino-photos/last-day-before-santiago.925/full?d=1405564836', function(err, buffer, contentType, tm) {
      expect(err).to.be.undefined;
      expect(buffer).to.be.ok;
      expect(buffer.length).to.be.gt(0);
      expect(contentType).to.eq('image/jpeg');
      expect(tm).to.be.gt(0);
      done();
    });
  });

  it('should fetch image for dimensions', function(done) {
    image.fetchImageForDimensions('https://lh6.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAAAGeI/HPBfsRDsAno/photo.jpg?sz=50', function(err, width, height, contentType, isAnimatedGif, buffer, downloadTime, sizeTime) {
      expect(err).to.be.null;
      expect(width).to.eq(50);
      expect(height).to.eq(50);
      expect(contentType).to.eq('image/jpeg');
      expect(isAnimatedGif).to.be.false;
      expect(buffer).to.be.ok;
      expect(buffer.length).to.be.gt(0);
      expect(downloadTime).to.be.gt(0);
      expect(sizeTime).to.be.gt(0);
      done();
    });
  });

  it('should identify image by url', function() {
    expect(image.detectMimeTypeFromUrl('https://lh6.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAAAGeI/HPBfsRDsAno/photo.jpg?sz=50')).to.eq('image/jpeg');
    expect(image.detectMimeTypeFromUrl('https://lh5.googleusercontent.com/-T3BabMtbiMU/UvulBRfQOBI/AAAAAAAAO3w/0cjHOXrPHjM/w506-h750/JcwUkLd.gif')).to.eq('image/gif');
    expect(image.detectMimeTypeFromUrl('https://lh5.googleusercontent.com/proxy/4FoZxVp5VWkd3DchfpJWC4rvgcOo3bbCf7z-ftrxmIUuCbEg3OeK1Tnt8HSRe6hxCOQp5tQfcZabPc09Kv2KRFzOuZyu3q9-Ln6fuwcAm1me9uPjNZUAOlaR2bwlZnMUjhG4o9hm2_SACxjPmvNSEA=w120-h120')).to.eq(null);
    expect(image.detectMimeTypeFromUrl('https://31.media.tumblr.com/af0484bec26d7468fbd4df4344073c88/tumblr_inline_myhljnbapa1qazk6o.png')).to.eq('image/png');
  });

  it('should identify gif', function() {
    expect(image.detectMimeType([0x47,0x49,0x46,0x38,0x39,0x61,0xfa,0x00,0x55,0x00,0xf7])).to.eq('image/gif');
  });

  it('should identify png', function() {
    expect(image.detectMimeType([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00])).to.eq('image/png');
  });

  it('should identify jpg', function() {
    expect(image.detectMimeType([0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46])).to.eq('image/jpeg');
    expect(image.detectMimeType([0xff,0xd8,0xff,0xe1,0x00,0x10,0x4a,0x46,0x49,0x46])).to.eq('image/jpeg');
  });

  it('should not identify', function() {
    expect(image.detectMimeType([])).to.be.null;
    expect(image.detectMimeType([0x00])).to.be.null;
    expect(image.detectMimeType([0x00,0x00])).to.be.null;
    expect(image.detectMimeType([0x00,0x00,0x00])).to.be.null;
    expect(image.detectMimeType([0x00,0x00,0x00,0x00])).to.be.null;
    expect(image.detectMimeType([0x00,0x00,0x00,0x00,0x00])).to.be.null;
    expect(image.detectMimeType([0x00,0x00,0x00,0x00,0x00,0x00])).to.be.null;
  });

  it('should detect animated gif', function() {
    expect(image.isAnimatedGif(new Buffer([0x00,0x21,0xF9,0x04, 0,0,0,0, 0,0x2c,  0x00,0x21,0xF9,0x04, 0,0,0,0, 0,0x21,  0x00,0x21,0xF9,0x04, 0,0,0,0, 0,0x21]))).to.be.true;
    expect(image.isAnimatedGif(new Buffer([0x00,0x21,0xF9,0x04, 0,0,0,0, 0,0x2c,  0x00,0x21,0xF9,0x04, 0,0,0,0, 0,0x21]))).to.be.true;
    expect(image.isAnimatedGif(new Buffer([0x00,0x21,0xF9,0x04, 0,0,0,0, 0,0x2c]))).to.be.false;
    expect(image.isAnimatedGif(new Buffer([0x00,0x21,0xF9,0x04, 0,0,0,0, 0,0x21]))).to.be.false;
    expect(image.isAnimatedGif(new Buffer([]))).to.be.false;
  });
});