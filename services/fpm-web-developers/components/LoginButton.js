import React from 'react';
import { inject } from 'mobx-react';
import { analyticsEvent } from '../utils/analytics';
import { LinkOutlineButton } from '../components/Link';
import { Router } from '../routes';

@inject('store')
class LoginButton extends React.Component {
  goTo = () => {
    const { store: { auth: { user, state } = {}, config: { auth: { authUrl } = {} } = {} } } = this.props;
    return user ? '/' : `${authUrl}&state=${state}`;
  };

  login = e => {
    const { store: { auth: { user } = {} } } = this.props;
    e.preventDefault();
    if (user) {
      Router.pushRoute('index');
    } else {
      analyticsEvent('user', 'login', 'top.menu');
      window.location.href = this.goTo();
    }
  };

  render() {
    return (
      <LinkOutlineButton href={this.goTo()} onClick={this.login}>
        Log In
      </LinkOutlineButton>
    );
  }
}

export default LoginButton;
