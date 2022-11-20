import React, { Component } from 'react';
import Head from 'next/head';
import { inject, observer } from 'mobx-react';
import styled from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import { SectionTop, SectionTopInset } from '../components/SectionTop';
import HeaderMenu from '../components/HeaderMenu';
import { Section, SectionInnerCol } from '../components/Section';
import Footer from '../components/Footer';
import Page from '../components/Page';
import Loading from '../components/Loading';
import { apiFetchApp } from '../stores/api';
import AppForm, { AppFormData } from '../components/AppForm';
import { DeleteFilledButton, GrayFilledButton, GrayOutlineButton, WaitingButton } from '../components/Buttons';

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

const Panel = styled(Col)`
  padding: 30px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);

  &:last-child {
    border-bottom: none;
  }

  &,
  h3 {
    color: rgba(0, 0, 0, 0.7);
  }
  h3 {
    marbin-bottom: 20px;
  }
`;

const Input = styled.input`
  resize: none;
  min-width: 350px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.4);
  padding: 10px;
  font-size: 12px;
  margin-right: 10px;
  margin-bottom: 10px;
`;

const Label = styled.div`
  text-align: left;
  margin-right: 10px;
  margin-bottom: 5px;
  font-size: 16px;
  font-weight: 500;
  text-transform: capitalize;
`;

@inject('store')
@observer
class EditApp extends Component {
  static async getInitialProps(ctx) {
    const { state, query: { app_id } = {} } = ctx;
    if (!app_id) {
      return ctx.res.redirect(302, '/');
    }
    const { app } = await apiFetchApp({ app_id, apiUrl: state.config.api.url, token: state.auth.token });
    state.ui.app = app;
    return { state };
  }

  componentWillMount() {
    const { store: { ui: { app } = {} } } = this.props;
    this.props.store.ui.showClientSecret = false;
    this.props.store.ui.form = new AppFormData({ app, store: this.props.store });
  }

  showClientSecret = () => {
    this.props.store.ui.showClientSecret = true;
  };

  deleteApp = async e => {
    e.preventDefault();

    const { store: { ui: { app: { app_id }, deleteApp } = {} } } = this.props;
    if (
      window.confirm(
        'Deleting this application cannot be undone. All existing tokens will become invalid.\n\nAre you sure you want to delete it?'
      )
    ) {
      await deleteApp({ app_id });
    }
  };

  regenerateSecret = async e => {
    e.preventDefault();
    const { store: { ui: { app: { app_id }, regenerateAppSecret } = {} } } = this.props;
    if (window.confirm('This will not invalidate existing tokens. Are you sure?')) {
      await regenerateAppSecret({ app_id });
    }
  };

  render() {
    const { store: { ui: { app, appDeleting, appUpdating, form, showClientSecret } = {} } } = this.props;
    return (
      <main>
        <Head>
          <title>
            Update Application {app && ` "${app.name}"`}
          </title>
        </Head>

        <AppsSectionTop>
          <SectionTopInset>
            <HeaderMenu />
            <HeaderContent center="xs">
              <Col xs={12}>
                <Title>Update Application</Title>
                <h2>
                  {app && app.name}
                </h2>
              </Col>
            </HeaderContent>
          </SectionTopInset>
        </AppsSectionTop>

        <Section style={{ margin: 0 }}>
          {!app
            ? <SectionInnerCol start="xs" center="xs">
                <Loading text="Loading application..." color="#54b8df" />
              </SectionInnerCol>
            : <SectionInnerCol start="xs" center="xs">
                <Panel start="xs">
                  <h3>App Credentials</h3>
                  <p>
                    These credentials allow your app to access the Friends+Me API. They are secret. Please don{"'"}t
                    share your app credentials with anyone, include them in public code repositories, or store them in
                    insecure ways.
                  </p>
                  <div style={{ marginBottom: 10 }}>
                    <Label>Client ID</Label>
                    <Input readOnly type="text" value={app.client_id} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <Label>Client Secret</Label>
                    <div>
                      <Input readOnly type={showClientSecret ? 'text' : 'password'} value={app.client_secret} />
                      {showClientSecret ||
                        <GrayOutlineButton
                          style={{ marginRight: 10, marginBottom: 10 }}
                          onClick={this.showClientSecret}
                        >
                          Show
                        </GrayOutlineButton>}
                      <WaitingButton
                        Button={GrayOutlineButton}
                        onClick={this.regenerateSecret}
                        waiting={appUpdating}
                        color="#666666"
                        text="Regenerate"
                      />
                    </div>
                    <p style={{ marginTop: 0 }}>
                      You{"'"}ll need to send this secret along with your client ID when making your{' '}
                      <a href="http://docs.fpme.apiary.io/#reference/oauth/oauthaccess">oauth.access</a> request.
                    </p>
                  </div>
                </Panel>

                <Panel start="xs">
                  <h3>Display Information</h3>
                  <AppForm form={form} />
                </Panel>

                <Panel start="xs">
                  <h3>Delete App</h3>
                  <p>
                    Your app has {app.users} authed user{app.users === 1 ? '' : 's'}.
                  </p>
                  <WaitingButton
                    Button={DeleteFilledButton}
                    onClick={!appDeleting && this.deleteApp}
                    waiting={appDeleting}
                    color="#CB4335"
                    text="Delete App"
                  />
                </Panel>
              </SectionInnerCol>}
        </Section>

        <Footer />
      </main>
    );
  }
}

export default Page(EditApp, true);
