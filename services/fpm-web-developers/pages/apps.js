import React, { Component } from 'react';
import Head from 'next/head';
import { inject, observer } from 'mobx-react';
import styled from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import { SectionTop, SectionTopInset } from '../components/SectionTop';
import HeaderMenu from '../components/HeaderMenu';
import { Section, SectionInner } from '../components/Section';
import Footer from '../components/Footer';
import Page from '../components/Page';
import { CreateFilledButton, EditOutlineButton } from '../components/Buttons';
import Avatar from '../components/Avatar';
import Loading from '../components/Loading';
import { Router, clickedRoute } from '../routes';
import { apiListApps } from '../stores/api';

const Title = styled.h1`
  color: #fff;
  font-size: 50px;
  font-weight: 100;
  margin-bottom: 15px;
  margin-top: 10px;

  b {
    font-weight: 300;
    font-size: 24px;
  }
`;

const HeaderContent = styled(Row)`
  h2 {
    line-height: 26px;
    color: rgba(255,255,255,0.6);
    font-size: 1.3125rem;
    font-weight: 100;

    b {
      color: rgba(255,255,255,0.8);
      font-weight: 400;
    }
  }
`;

const AppsSectionTop = styled(SectionTop)`
  min-height: 260px;
  &:before {
    top: -7rem;
  }
`;

const AvatarCol = styled(Col)`
  border-radius: .3em;
  margin-right: 10px;
  width: 50px;
  height: 50px;
`;

const AppDetail = styled(Col)`
  padding-left: 10px;
  text-align: left;
`;

const AppName = styled.a`
  font-size: 16px;
  color: rgba(0, 0, 0, 0.75);
`;

const AppUsers = styled(Col)`
  font-size: 10px;
  color: rgba(0, 0, 0, 0.4);
`;

const App = styled(Row)`
  cursor: pointer;
  padding:  10px 0;
  border-bottom: 1px solid rgba(0,0,0,0.05);

  a {
    text-decoration: none;
  }
  &:hover a {
    text-decoration: underline;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const CreateAppButton = styled(CreateFilledButton)`
  margin-top: 50px;
`;

@inject('store')
@observer
class Apps extends Component {
  static async getInitialProps(ctx) {
    const { state } = ctx;
    const { apps } = await apiListApps({ apiUrl: state.config.api.url, token: state.auth.token });
    state.ui.apps = apps || [];
    state.ui.appsLoaded = true;
    return { state };
  }

  async componentDidMount() {
    const { store } = this.props;
    if (store.auth.token && !store.ui.apps.length) {
      await store.ui.fetchApps();
    }
  }

  render() {
    const { store: { ui: { appsLoaded, appsLoading, apps, editApp } = {} } } = this.props;
    return (
      <main>
        <Head>
          <title>Your Applications</title>
        </Head>

        <AppsSectionTop>
          <SectionTopInset>
            <HeaderMenu />
            <HeaderContent center="xs">
              <Col xs={12}>
                <Title>Your Applications</Title>
                <h2>Manage your applications.</h2>
              </Col>
            </HeaderContent>
          </SectionTopInset>
        </AppsSectionTop>

        <Section style={{ margin: 0 }}>
          <SectionInner start="xs" center="xs">
            <Col>
              {!appsLoaded || appsLoading
                ? <Loading text="Loading applications..." color="#54b8df" />
                : <div>
                    {apps.map(app =>
                      <App key={app.app_id} middle="xs" onClick={() => editApp(app)}>
                        <AvatarCol>
                          <Avatar src={app.picture} />
                        </AvatarCol>
                        <AppDetail start="xs">
                          <AppName xs={true}>
                            {app.name}
                          </AppName>
                          <AppUsers>
                            {app.users} user{app.users !== 1 ? 's' : ''}
                          </AppUsers>
                        </AppDetail>
                      </App>
                    )}
                  </div>}
              <CreateAppButton onClick={clickedRoute('apps-new')}>Create New App</CreateAppButton>
            </Col>
          </SectionInner>
        </Section>

        <Footer />
      </main>
    );
  }
}

export default Page(Apps, true);
