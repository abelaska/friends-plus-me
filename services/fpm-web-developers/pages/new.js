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
import AppForm, { AppFormData } from '../components/AppForm';

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

const Label = styled(Col)`
  text-align: left;
  margin-right: 10px;
  margin-bottom: 5px;
  font-size: 16px;
  font-weight: 500;
`;

const Textarea = styled.textarea`
  resize: none;
  width: 100%;
  min-width: 200px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.4);
  padding: 10px;
  font-size: 14px;
`;

const Input = styled.input`
  resize: none;
  width: 100%;
  min-width: 200px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.4);
  padding: 10px;
  font-size: 14px;
`;

const Line = styled(Col)`
margin-bottom: 30px;
`;

const Value = styled(Col)`
text-align: left;

small {
  font-size: 13px;
  color: rgba(0,0,0,0.6);
}
`;

@inject('store')
@observer
class NewApp extends Component {
  componentWillMount() {
    const { store } = this.props;
    this.props.store.ui.form = new AppFormData({ store });
  }

  render() {
    const { store: { ui: { form } = {} } } = this.props;
    return (
      <main>
        <Head>
          <title>Create Application</title>
        </Head>

        <AppsSectionTop>
          <SectionTopInset>
            <HeaderMenu />
            <HeaderContent center="xs">
              <Col xs={12}>
                <Title>Create Application</Title>
                <h2>Create a new app for Friends+Me users.</h2>
              </Col>
            </HeaderContent>
          </SectionTopInset>
        </AppsSectionTop>

        <Section style={{ margin: 0 }}>
          <SectionInner>
            <Row xs={12} start="xs" center="xs">
              <AppForm form={form} />
            </Row>
          </SectionInner>
        </Section>

        <Footer />
      </main>
    );
  }
}

export default Page(NewApp, true);
