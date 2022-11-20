'use strict';
/*jshint -W106*/

// https://github.com/CogniStreamer/tinyMCE-mention

angular.module('tinymce-mention', []).provider('TinyMCEMention', function() {

  var TinyMCEMention = ['$rootScope', 'Google', 'config', '_', function($rootScope, Google, config, _) {

    // var delimiterSearch = {
    //   '@': Plus.searchPeople.bind(Plus),
    //   '+': Plus.searchPeople.bind(Plus)
    // };

    this.delay = 100;
    this.items = 50;
    this.delimiter = []; // _.keys(delimiterSearch);
    this.lastDelimiter = null;
    this.onInsert = null;
    // this.source = [
    //   { name: 'Tyra Porcelli' },
    //   { name: 'Brigid Reddish' },
    //   { name: 'Ashely Buckler' },
    //   { name: 'Teddy Whelan' }
    // ];

    this.isEnabled = function() {
      return true;
    }.bind(this);

    this.isDisabled = function() {
      return !this.isEnabled();
    }.bind(this);

    this.renderDropdown = function () {
      if (this.isDisabled()) {
        return '<span></span>';
      }
      return '<ul class="rte-autocomplete dropdown-menu"><li class="loading"><i class="fa fa-spinner fa-spin"></i></li></ul>';
    }.bind(this);

    this.insert = function(item) {
      if (this.onInsert) {
        this.onInsert(item);
      }
      return '<input type="button" class="autocompleted autocompleted-'+item.type+'" value="'+this.lastDelimiter+item.name+'"'+(item.id ? (' data-uid="'+item.id+'"'):'')+'/>&nbsp;';
    }.bind(this);

    this.render = function(item) {
      if (this.isDisabled()) {
        return '<span></span>';
      }
      var html =
        '<li>'+
        '<a href="javascript:;" class="autocomplete-item-'+item.type+'"><img src="'+item.image+'?sz=32"><span>'+item.name+'</span></a>'+
        '</li>';
      return html;
    }.bind(this);

    this.source = function(query, process, delimiter) {
      if (this.isDisabled()) {
        return;
      }
      if (!query) {
        process([]);
      } else {
        this.lastDelimiter = delimiter;

        var q = delimiterSearch[delimiter];
        if (q) {
          q(null, query, function(err, people) {
            people = people || [];
            people.forEach(function(p) { p.type = 'person'; });
            process(people || []);
          });
        } else {
          process([]);
        }
      }
    }.bind(this);
  }];

  this.$get = ['$injector', function($injector) {
    return $injector.instantiate(TinyMCEMention, {});
  }];
});
