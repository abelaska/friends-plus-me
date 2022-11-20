import React from 'react';
import { inject } from 'mobx-react';
import styled from 'styled-components';
import { analyticsEvent } from '../utils/analytics';
import { LinkOutlineButton } from '../components/Link';
import { Router } from '../routes';

const StartButton = styled(LinkOutlineButton)`
  font-size: 20px;
  padding: 15px 30px;
`;

@inject('store')
class StartBuildingButton extends React.Component {
  goTo = () => {
    const { store: { auth: { user, state } = {}, config: { auth: { authUrl } = {} } = {} } } = this.props;
    return user ? '/apps' : `${authUrl}&state=${state}`;
  };

  start = e => {
    const { store: { auth: { user } = {} } } = this.props;
    e.preventDefault();
    if (user) {
      Router.pushRoute('apps');
    } else {
      analyticsEvent('user', 'login', 'start.building');
      window.location.href = this.goTo();
    }
  };

  render() {
    return (
      <StartButton href={this.goTo()} onClick={this.start}>
        Start Building
      </StartButton>
    );
  }
}

export default StartBuildingButton;
