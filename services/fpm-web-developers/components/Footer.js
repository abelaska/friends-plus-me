import styled, { ThemeProvider } from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import { theme } from '../components/Theme';
import Logo from '../components/Logo';
import StartMyFreeTrialButton from '../components/StartMyFreeTrialButton';

const Footer = styled.footer`
  background-color: #2d3236;
  color: #8598a7;
  margin-top: 50px;
`;

const FooterInner = styled.div`
  max-width: 1300px;
  margin-left: auto;
  margin-right: auto;
  padding-bottom: 20px;
  padding-right: 20px;
  padding-left: 20px;
`;

const FooterTop = styled(Row)`
  color: #fff;
  padding-top: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
`;

const FooterTitle = styled(Row)`font-size: 16px;height: 50px;margin-right:10px;`;

const FooterLink = styled.a`
  display: block;
  color: #8598a7;
  font-size: 14px;
  line-height: 28px;
  font-weight: 200;
  text-align: left;
  text-decoration: none;

  &:hover {
    color: #fff;
  }
`;

const FooterCopyright = styled(Row)`
  font-size: 12px;
  font-weight: 300;
  padding-bottom: 80px;
  padding-top: 50px;
`;

const FooterMenu = styled(Row)`
  padding-top: 20px;
`;

const Menu = styled(Row)`
  height: 50px;
`;

export default () =>
  <ThemeProvider theme={theme}>
    <Footer>
      <FooterInner>
        <FooterTop between="xs">
          <Row start="xs" middle="xs">
            <Menu middle="xs" center="xs">
              <Logo style={{ height: 50 }} />
            </Menu>
          </Row>
          <Row start="xs" middle="xs">
            <FooterTitle middle="xs" center="xs">
              Scheduling and content management solution for you.
            </FooterTitle>
            <Menu middle="xs" center="xs">
              <StartMyFreeTrialButton />
            </Menu>
          </Row>
        </FooterTop>

        <FooterMenu>
          <Col xs={12} sm={true} md={true} lg={true}>
            <FooterLink href="https://friendsplus.me/pricing">Pricing</FooterLink>
            <FooterLink href="https://blog.friendsplus.me">Blog</FooterLink>
            <FooterLink href="https://friendsplus.me/wall-of-love">Wall of Love</FooterLink>
          </Col>
          <Col xs={12} sm={true} md={true} lg={true}>
            <FooterLink href="https://friendsplus.me/about">About</FooterLink>
            <FooterLink href="/">Developers</FooterLink>
            <FooterLink href="mailto:support@friendsplus.me">Contact Us</FooterLink>
          </Col>
          <Col xs={12} sm={true} md={true} lg={true}>
            <FooterLink href="http://help.friendsplus.me">Help Center</FooterLink>
            <FooterLink href="http://app.friendsplus.me/signin">Log In</FooterLink>
            <FooterLink href="http://app.friendsplus.me/signup">Sign up</FooterLink>
          </Col>
          <Col xs={12} sm={true} md={true} lg={true}>
            <FooterLink href="https://friendsplus.me/privacy">Privacy</FooterLink>
            <FooterLink href="https://friendsplus.me/tos">Terms</FooterLink>
          </Col>
        </FooterMenu>

        <FooterCopyright>
          <Col xs={12}>
            Copyright &copy; {new Date().getFullYear()} Loysoft Limited, All rights reserved.
          </Col>
        </FooterCopyright>
      </FooterInner>
    </Footer>
  </ThemeProvider>;
