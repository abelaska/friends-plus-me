import React, { Component } from 'react';
import { Router, clickedRoute } from '../routes';
import { inject, observer } from 'mobx-react';
import styled, { ThemeProvider } from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import { theme } from '../components/Theme';
import Logo from '../components/Logo';
import { HeaderLink } from '../components/Link';
import LoginButton from '../components/LoginButton';
import LogoutButton from '../components/LogoutButton';
import Avatar from '../components/Avatar';

const HeaderMenu = styled(Row)`
  margin-bottom: 10px;
  padding-top: 20px;
`;

const Menu = styled(Row)`
  height: 50px;
`;

const MenuAvatar = styled(Avatar)`
  height: 30px;
  border-radius: 50%;
`;

const LogoLink = styled.a`
  cursor: pointer;
  text-decoration: none;
`;

@inject('store')
@observer
class HeaderMenuComponent extends Component {
  render() {
    const { store: { auth: { user } = {} }, router } = this.props;
    return (
      <ThemeProvider theme={theme}>
        <HeaderMenu between="xs">
          <Row start="xs" middle="xs">
            <Menu middle="xs" center="xs">
              <LogoLink href="/" onClick={clickedRoute('index')}>
                <Logo />
              </LogoLink>
            </Menu>
          </Row>
          <Row start="xs" middle="xs">
            <Menu middle="xs" center="xs">
              <HeaderLink href="http://docs.fpme.apiary.io/">Docs</HeaderLink>
            </Menu>
            {user
              ? <Menu middle="xs" center="xs">
                  <HeaderLink href="/apps" onClick={clickedRoute('apps')}>
                    My Apps
                  </HeaderLink>
                </Menu>
              : null}
            <Menu middle="xs" center="xs" style={{ marginLeft: 10 }}>
              {user ? <LogoutButton /> : <LoginButton />}
            </Menu>
          </Row>
        </HeaderMenu>
      </ThemeProvider>
    );
  }
}

export default HeaderMenuComponent;
