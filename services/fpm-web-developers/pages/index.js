import React, { Component } from 'react';
import Head from 'next/head';
import { inject, observer } from 'mobx-react';
import styled from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import HeaderMenu from '../components/HeaderMenu';
import { SectionTop, SectionTopInset } from '../components/SectionTop';
import Footer from '../components/Footer';
import Page from '../components/Page';
import StartBuildingButton from '../components/StartBuildingButton';

const Title = styled.h1`
  color: #fff;
  font-size: 50px;
  font-weight: 100;

  small {
    font-weight: 300;
    font-size: 24px;
  }
`;

const SubTitle = styled.h2`
  margin-bottom: 42px;
  color: #fff;
  font-size: 16px;
  line-height: 2em;
  font-weight: 100;
`;

const HeaderImage = styled.div`
  max-width: 60%;
  margin: 0 20%;
  margin-top: 20px;
`;

const HeaderContent = styled(Row)`
  margin-top: 65px;

  h2 {
    line-height: 26px;
    color: rgba(255,255,255,0.6);
    font-size: 1.3125rem;
    font-weight: 100;
    margin: 3rem 0 4.6875rem;

    > span {
      color: #fff;
      font-weight: 400;
    }
  }
`;

@inject('store')
@observer
class Index extends Component {
  render() {
    return (
      <main>
        <Head>
          <title>Friends+Me Developers</title>
        </Head>
        <SectionTop>
          <SectionTopInset>
            <HeaderMenu />
            <HeaderContent center="xs">
              <Col xs={12}>
                <Title>
                  Friends+Me for <strong>DEVELOPERS</strong>
                </Title>
                <SubTitle>Build useful apps for Friends+Me users.</SubTitle>
                <StartBuildingButton />
              </Col>
            </HeaderContent>
          </SectionTopInset>
        </SectionTop>

        <Footer />
      </main>
    );
  }
}

export default Page(Index);
