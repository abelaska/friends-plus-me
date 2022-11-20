import styled, { ThemeProvider } from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import { theme } from '../components/Theme';
import Logo from '../components/Logo';
import { HeaderLink } from '../components/Link';
import StartMyFreeTrialButton from '../components/StartMyFreeTrialButton';

const HeaderMenu = styled(Row)`
  margin-bottom: 10px;
  padding-top: 20px;
`;

const Menu = styled(Row)`
  height: 50px;
`;

const LogoLink = styled.a`text-decoration: none;`;

export default () =>
  <ThemeProvider theme={theme}>
    <HeaderMenu between="xs">
      <Row start="xs" middle="xs">
        <Menu middle="xs" center="xs">
          <LogoLink href="/">
            <Logo />
          </LogoLink>
        </Menu>
      </Row>
      <Row start="xs" middle="xs">
        <Menu middle="xs" center="xs">
          <HeaderLink href="/pricing">Pricing</HeaderLink>
        </Menu>
        <Menu middle="xs" center="xs">
          <HeaderLink href="https://blog.friendsplus.me">Blog</HeaderLink>
        </Menu>
        <Menu middle="xs" center="xs" style={{ marginRight: 10 }}>
          <HeaderLink href="https://app.friendsplus.me/signin">Log In</HeaderLink>
        </Menu>
        <Menu middle="xs" center="xs">
          <StartMyFreeTrialButton />
        </Menu>
      </Row>
    </HeaderMenu>
  </ThemeProvider>;
