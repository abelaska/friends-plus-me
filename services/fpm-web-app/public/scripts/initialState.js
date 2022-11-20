/* global window, document, deepmerge */

var initialState = window.__initialState = JSON.parse(document.body.getAttribute('initial-state'));

window.__config = initialState.config && deepmerge(window.__config, initialState.config) || window.__config;
