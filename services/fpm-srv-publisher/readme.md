https://github.com/LearnBoost/kue

blokace odpovedi z google apis pro simulaci pretizeni aplikace a jeji pad:

www.googleapis.com  173.194.70.95
accounts.google.com 173.194.70.84

iptables -A INPUT -s 173.194.70.95 -j DROP;iptables -A INPUT -s 173.194.70.84 -j DROP
iptables -F

=========================================================================

jak spustit jeden test:

mocha specs/GooglePlusBatch.specs.js

=========================================================================

testing Chai.js http://chaijs.com/api/bdd/

=========================================================================

https://github.com/jdarling/MongoMQ

=========================================================================
var Slower = module.exports = function Slower(lockManager) {

  this.timer = null;
  this.stopCallback = null;
  this.running = false;
  this.lockManager = lockManager;

  return this;
}

Slower.prototype.start = function(runNow) {

  this.cron = new cronJob('* * * * * *', function() {
    if (!this.running) {
      this.running = true;
      this._run(function() {
        this.running = false;
      }.bind(this));
    }
  }.bind(this), function() {

    log.info('Stopped Slower');

    if (this.stopCallback) {
      this.stopCallback();
    }
  }.bind(this), true, 'UTC', this);
/*
  if (this.stopCallback) {
    this._stopped(this.stopCallback);
  } else {
    this.timer = setTimeout(function() {
      this.running = true;
      this._run(function() {
        this.running = false;
        this.start.bind(this);
      }.bind(this));
    }.bind(this), runNow ? 0 : config.get('slower:wait'));
  }*/
};

Slower.prototype.stop = function(callback) {

  log.info('Stopping Slower');

  this.stopCallback = callback;
  this.cron.stop();
/*
  if (this.timer) {
  
    clearTimeout(this.timer);
  
    this.timer = null;

    this._stopped(callback);

  } else {
    if (this.running) {
      this.stopCallback = callback;
    } else {
      this._stopped(callback);
    }
  }*/
};
/*
Slower.prototype._stopped = function(callback) {
  
  log.info('Stopped Slower');

  callback();
};*/
=========================================================================