import React from 'react';
import Head from 'next/head';
import styled, { ThemeProvider } from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import { theme } from '../components/Theme';
import { SectionTop, SectionTopInset } from '../components/SectionTop';
import HeaderMenu from '../components/HeaderMenu';
import { customers } from '../components/Customers';
import Endorsement from '../components/Endorsement';
import StartFilledButton from '../components/StartFilledButton';
import { Section, SectionInner } from '../components/Section';
import Footer from '../components/Footer';

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

export default () =>
  <ThemeProvider theme={theme}>
    <main>
      <Head>
        <title>Friends+Me Wall of Love</title>
      </Head>

      <SectionTop style={{ minHeight: 400 }}>
        <SectionTopInset>
          <HeaderMenu />
          <HeaderContent center="xs">
            <Col xs={12}>
              <Title>Our Wall of Love</Title>
              <h2>
                <b>We have the best customers on the planet.</b> Here are some of the glowing things they{"'"}ve said
                about us.
              </h2>
            </Col>
          </HeaderContent>
        </SectionTopInset>
      </SectionTop>

      <Section style={{ margin: 0 }}>
        <SectionInner start="xs" center="xs">
          {customers.map(c =>
            <Col xs={12} sm={4} style={{ padding: '10px' }}>
              <Endorsement customer={c} />
            </Col>
          )}
        </SectionInner>
      </Section>

      <Footer />
    </main>
  </ThemeProvider>;
