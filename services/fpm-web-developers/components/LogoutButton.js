import React from 'react';
import { analyticsEvent } from '../utils/analytics';
import { LinkOutlineButton } from '../components/Link';

class LogoutButton extends React.Component {
  logout = e => {
    e.preventDefault();
    analyticsEvent('user', 'login', 'top.menu');
    window.location.href = '/logout';
  };

  render() {
    return (
      <LinkOutlineButton href="/logout" onClick={this.logout}>
        Log Out
      </LinkOutlineButton>
    );
  }
}

export default LogoutButton;
