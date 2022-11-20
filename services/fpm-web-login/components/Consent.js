import React, { Component } from 'react';
import Head from 'next/head';
import { inject, observer } from 'mobx-react';
import styled from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import { Scopes } from '@fpm/constants';
import Avatar from '../components/Avatar';
import AuthorizeButton from '../components/AuthorizeButton';
import CancelButton from '../components/CancelButton';
import { apiApprove } from '../utils/api';
import Loading from './Loading';

const Title = styled.h1`
  color: #fff;
  font-size: 50px;
  font-weight: 100;
  margin-bottom: 15px;

  b {
    font-weight: 300;
    font-size: 24px;
  }
`;

const Header = styled(Row)`
  padding: 50px 20px;
  font-size: 20px;
  font-weight: 300;
  background-color: rgba(255, 255, 255, 0.4);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;

  b {
    font-weight: 500;
  }
`;

const HeaderInner = styled(Col)``;

const HeaderPictures = styled(Row)`
  margin-bottom: 20px;
`;

const ArrowIcon = styled.div`
  font-size: 30px;
  line-height: 20px;
  color: rgba(0, 0, 0, 0.4);
`;

const Arrows = styled.div`
  margin: 0 50px;
`;

const ScopeList = styled.div`
  margin: 50px 0;
`;
const Scope = styled(Row)`
  min-width: 400px;
  min-height: 60px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);

  &:last-child {
    border-bottom: none;
  }
`;
const ScopeDescription = styled(Col)`
  color: #000;
  font-weight: 500;
  font-size: 15px;
`;

const ScopeInfo = styled(Col)`
  cursor: default;
  color: rgba(0, 0, 0, 0.4);
  position: relative;

  .popover {
    background-color: rgba(0, 0, 0, 0.85);
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.4);
    border-radius: 5px;
    top: 0;
    right: 20px;
    color: #fff;
    display: none;
    font-size: 13px;
    padding: 10px;
    position: absolute;
    min-width: 200px;
    max-width: 320px;
    z-index: 4;
  }

  &:hover {
    .popover {
      display: block;
      -webkit-animation: fade-in 0.2s linear 1;
      -moz-animation: fade-in 0.2s linear 1;
      -ms-animation: fade-in 0.2s linear 1;
    }
  }
`;

const Box = styled.div`
  max-width: 800px;
  margin: 50px auto;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
`;

const Page = styled(Row)`
  width: 100%;
  min-height: 100%;

  background: -webkit-linear-gradient(-410deg, #0f3966 10%, #54b8df 90%);
  background: linear-gradient(140deg, #0f3966 10%, #54b8df 90%);
`;

@inject('store')
@observer
class Consent extends Component {
  redirectWithConsent = consent => {
    window.location.href = `${this.props.store.core.challenge.redir}&consent=${consent}`;
  };

  authorize = () => {
    const { store } = this.props;
    this.props.store.ui.startRedirecting();
    apiApprove({
      store,
      clientId: store.core.challenge.clientId,
      challenge: store.core.challenge.original,
      auth0IdToken: store.ui.consent.auth0IdToken
    })
      .then(({ consent }) => this.redirectWithConsent(consent))
      .catch(error => {
        // TODO show error
        // console.log('approve error', error)
      });
  };

  cancel = () => {
    this.props.store.ui.startRedirecting();
    this.redirectWithConsent('denied');
  };

  render() {
    const { store } = this.props;
    const { scope } = store.core.challenge;
    const { redirecting, consent: { user, app, additional_scopes } } = store.ui;
    const scopes = scope.map(name => ({
      name,
      description: Scopes.details[name].description,
      info: Scopes.details[name].info
    }));

    return (
      <main>
        <Head>
          <title>{app.name} Authentication</title>
        </Head>
        <Page center="xs" middle="xs">
          <Col center="xs">
            <Box>
              <Header center="xs" middle="xs">
                <HeaderInner center="xs">
                  <HeaderPictures center="xs" middle="xs">
                    <Col right="xs">
                      <Avatar src={app.picture} name={app.name} />
                    </Col>
                    <Arrows>
                      <ArrowIcon>→</ArrowIcon>
                      <ArrowIcon>←</ArrowIcon>
                    </Arrows>
                    <Col left="xs">
                      <Avatar src={user.picture} name={user.name} />
                    </Col>
                  </HeaderPictures>
                  <div>
                    <b>{app.name}</b> will be able to access <b>{user.name}</b> account and ...
                  </div>
                </HeaderInner>
              </Header>
              <Row center="xs">
                <ScopeList>
                  {scopes.map(scope => (
                    <Scope key={scope.name} start="xs" middle="xs">
                      <ScopeDescription xs={11}>{scope.description}</ScopeDescription>
                      <ScopeInfo>
                        ⓘ<span className="popover">{scope.info || scope.description}</span>
                      </ScopeInfo>
                    </Scope>
                  ))}
                </ScopeList>
              </Row>
              {(redirecting && (
                <Row center="xs" style={{ paddingBottom: 50 }}>
                  <Loading size={48} border={4} space={4} />
                </Row>
              )) || (
                <Row center="xs" style={{ paddingBottom: 50 }}>
                  <Row right="xs">
                    <CancelButton onClick={this.cancel} disabled={redirecting} />
                  </Row>
                  <div style={{ width: 30 }} />
                  <Row left="xs">
                    <AuthorizeButton onClick={this.authorize} disabled={redirecting} />
                  </Row>
                </Row>
              )}
            </Box>
          </Col>
        </Page>
      </main>
    );
  }
}

export default Consent;
