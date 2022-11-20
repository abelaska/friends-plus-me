import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import styled from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import Loading from './Loading';

const LogoText = styled.div`
  font-size: 19px;
  color: #fff;
  margin-left: 10px;
  font-weight: 300;
`;

const Logo = styled(Row)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  margin: 20px 1.5625rem;
  max-width: 1300px;
  margin-right: auto;
  margin-left: auto;

  img {
    width: 46px;
    height: 46px;
  }
`;

const Page = styled(Row)`
  width: 100%;
  min-height: 100%;

  background: -webkit-linear-gradient(-410deg, #0f3966 10%, #54b8df 90%);
  background: linear-gradient(140deg, #0f3966 10%, #54b8df 90%);
`;

const Title = styled.h1`
  font-weight: 300;
  color: #fff;
`;

const Agreement = styled.p`
  margin: 20px 0;
  font-size: 11px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.7);
  a,
  a:active,
  a:visited {
    font-weight: 300;
    color: rgba(255, 255, 255, 0.4);
  }
  a:hover {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const SwitchTo = styled.div`
  font-size: 21px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.7);
`;
const SwitchText = styled.span``;
const SwitchCTA = styled.span`
  cursor: pointer;
  font-weight: 300;
  text-decoration: underline;
  color: rgba(255, 255, 255, 0.9);
  &:hover {
    color: rgba(255, 255, 255, 1);
  }
`;

@inject('store')
@observer
class Login extends Component {
  render() {
    const { store: { ui: { sign, consenting, switchToSignUp, switchToSignIn } } } = this.props;
    const isSignUp = sign === 'up';
    const title = consenting ? (isSignUp ? 'Signing Up' : 'Signing In') : isSignUp ? 'Sign Up' : 'Sign In';
    const switchText = isSignUp ? 'Already have an account?' : 'Need an Account?';
    const switchCTA = isSignUp ? 'Sign In' : 'Sign Up Now';
    const switchFce = isSignUp ? switchToSignIn : switchToSignUp;
    return (
      <Page center="xs" middle="xs">
        <Col center="xs">
          <Logo middle="xs" start="xs">
            <img src="https://storage.googleapis.com/static.friendsplus.me/images/fpm.png" alt="Friends+Me" />
            <LogoText flex>Friends+Me</LogoText>
          </Logo>
          <Title>{title}</Title>
          <div id="hiw-login-container" />
          {(consenting && <Loading size={64} border={4} space={4} />) || (
            <div>
              <Agreement>
                By signing you agree to our{' '}
                <a href="https://friendsplus.me/tos" target="_blank">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="https://friendsplus.me/privacy" target="_blank">
                  Privacy Policy
                </a>.
              </Agreement>
              <SwitchTo>
                <SwitchText>{switchText}</SwitchText>&nbsp;<SwitchCTA
                  onClick={() => switchFce({ store: this.props.store })}
                >
                  {switchCTA}
                </SwitchCTA>
              </SwitchTo>
            </div>
          )}
        </Col>
      </Page>
    );
  }
}

export default Login;
