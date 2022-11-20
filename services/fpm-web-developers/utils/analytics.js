/* global window */
import isServer from './isServer';

export const analyticsPageView = () => {
  if (!isServer) {
    window.ga('set', 'page', window.location.pathname);
    window.ga('send', 'pageview');
  }
};
export const analyticsEvent = (...args) => isServer || window.ga('send', 'event', ...args);
