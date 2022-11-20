/* jshint node: true, esversion: 6, newcap: true */
'use strict';

function arrayContains(a, obj) {
  if (a) {
    for (var i = 0; i < a.length; i++) {
      if (a[i] === obj) {
        return true;
      }
    }
  }
  return false;
}

var regexen = {};

// Builds a RegExp
function regexSupplant(regex, flags) {
  flags = flags || "";
  if (typeof regex !== "string") {
    if (regex.global && flags.indexOf("g") < 0) {
      flags += "g";
    }
    if (regex.ignoreCase && flags.indexOf("i") < 0) {
      flags += "i";
    }
    if (regex.multiline && flags.indexOf("m") < 0) {
      flags += "m";
    }

    regex = regex.source;
  }

  return new RegExp(regex.replace(/#\{(\w+)\}/g, function(match, name) {
    var newRegex = regexen[name] || "";
    if (typeof newRegex !== "string") {
      newRegex = newRegex.source;
    }
    return newRegex;
  }), flags);
}

regexen.hashSigns = /[#＃]/;
regexen.hashtagAlpha = regexSupplant(/[a-z_#{latinAccentChars}#{nonLatinHashtagChars}]/i);
regexen.hashtagAlphaNumeric = regexSupplant(/[a-z0-9_#{latinAccentChars}#{nonLatinHashtagChars}]/i);
regexen.endHashtagMatch = regexSupplant(/^(?:#{hashSigns}|:\/\/)/);
regexen.hashtagBoundary = regexSupplant(/(?:^|$|[^&a-z0-9_#{latinAccentChars}#{nonLatinHashtagChars}])/);
regexen.validHashtag = regexSupplant(/(#{hashtagBoundary})(#{hashSigns})(#{hashtagAlphaNumeric}*#{hashtagAlpha}#{hashtagAlphaNumeric}*)/gi);

function removeControlHashtagsHtml(message, removeHashtags, keepHashAsText) {

  var text = message;

  if (!text || !removeHashtags || removeHashtags.length === 0) {
    return message;
  }

  for(var i = 0; i < removeHashtags.length; i++) {
    var regexp = new RegExp('<a rel=[\"\']nofollow[\"\'] class=[\"\']ot-hashtag[\"\'] href=[\"\']https://plus.google.com/s/%23'+removeHashtags[i]+'[\"\']>#'+removeHashtags[i]+'</a>', 'gi');
    text = text.replace(regexp, keepHashAsText ? '#'+removeHashtags[i] : '');
    regexp = new RegExp('<a class=[\"\']ot-hashtag[\"\'] href=[\"\']https://plus.google.com/s/%23'+removeHashtags[i]+'[\"\']>#'+removeHashtags[i]+'</a>', 'gi');
    text = text.replace(regexp, keepHashAsText ? '#'+removeHashtags[i] : '');
  }

  return text.replace(/^\s+|\s+$/g, '');
}
exports.removeControlHashtagsHtml = removeControlHashtagsHtml;

function removeControlHashtags(message, removeHashtags) {

  var after, startPosition, endPosition,
      offs = 0,
      text = message;

  if (!text || !text.match(regexen.hashSigns) || !removeHashtags || !removeHashtags.length) {
    return message;
  }

  removeHashtags = removeHashtags.map(function(ht) {
    return ht.toLowerCase();
  });

  text.toLowerCase().replace(regexen.validHashtag, function(match, before, hash, hashText, offset, chunk) {
    after = chunk.slice(offset + match.length);

    if (after.match(regexen.endHashtagMatch)) {
      return;
    }

    if (arrayContains(removeHashtags, hashText)) {
      startPosition = offs + offset + before.length;
      endPosition = startPosition + hashText.length + 1;
      message = message.substring(0, startPosition) + message.substring(endPosition, message.length);
      offs -= hashText.length + 1;
    }
  });

  return message.replace(/[ \t\r]+/g, ' ').replace(/^\s+|\s+$/g, '');
}
exports.removeControlHashtags = removeControlHashtags;

function extractHashtags(text, doNotLowerCase) {

  if (!text || !text.match(regexen.hashSigns)) {
    return [];
  }

  var tags = [];

  (doNotLowerCase ? text : text.toLowerCase()).replace(regexen.validHashtag, function(match, before, hash, hashText, offset, chunk) {
    var after = chunk.slice(offset + match.length);
    if (after.match(regexen.endHashtagMatch)) {
      return;
    }
    tags.push(hashText);
    /*var startPosition = offset + before.length;
    var endPosition = startPosition + hashText.length + 1;
    tags.push({
      hashtag: hashText,
      indices: [startPosition, endPosition]
    });*/
  });

  return tags;
}
exports.extractHashtags = extractHashtags;

//console.log(extractHashtags('aaa bb #c #ddd #e#f aa #g #F')); // [ 'c', 'ddd', 'g' ]
//console.log(extractHashtags()); // [ 'c', 'ddd', 'g' ]
//console.log(extractHashtags("<a class='ot-hashtag' href='https://plus.google.com/s/%23politics'>#politics</a> #c <a class='ot-hashtag' href='https://plus.google.com/s/%23romney'>#romney</a>")); // [ 'politics', 'c', 'romney' ]