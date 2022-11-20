import React from "react";
import Head from "next/head";
import styled, { ThemeProvider } from "styled-components";
import { Col, Row } from "react-styled-flexboxgrid";
import { theme } from "../components/Theme";
import { SectionTop, SectionTopInset } from "../components/SectionTop";
import HeaderMenu from "../components/HeaderMenu";
import { customers } from "../components/Customers";
import Endorsement from "../components/Endorsement";
import { randomCustomers } from "../components/Customers";
import { Section, SectionInner } from "../components/Section";
import { LinkOutlineButton } from "../components/Link";
import StartMyFreeTrialButton from "../components/StartMyFreeTrialButton";
import Footer from "../components/Footer";

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
    color: rgba(255, 255, 255, 0.6);
    font-size: 1.3125rem;
    font-weight: 100;

    b {
      color: rgba(255, 255, 255, 0.8);
      font-weight: 400;
    }
  }
`;

const Employee = styled.div`
  color: #50565a;
  padding: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  margin-right: 20px;
  margin-bottom: 20px;

  img {
    max-width: 250px;
    border-top-right-radius: 8px;
    border-top-left-radius: 8px;
  }
`;

const EmployeeName = styled.h2`
  text-align: center;
  margin-top: 10px;
  margin-bottom: 5px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
`;

const EmployeeTitle = styled.div`
  text-align: center;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.5);
`;

const StoryTitle = styled.h3``;

const StoryText = styled.p`
  font-weight: 300;
  text-align: justify;
  font-size: 16px;
`;

export default () => (
  <ThemeProvider theme={theme}>
    <main>
      <Head>
        <title>Friends+Me About</title>
      </Head>

      <SectionTop style={{ minHeight: 400 }}>
        <SectionTopInset>
          <HeaderMenu />
          <HeaderContent center="xs">
            <Col xs={12}>
              <Title>Who{"'"}s behind all this?</Title>
              <h2>Our fearless and dashing team</h2>
            </Col>
          </HeaderContent>
        </SectionTopInset>
      </SectionTop>

      <Section style={{ margin: 0 }}>
        <SectionInner start="xs" center="xs">
          <Employee>
            <img src={`/static/team/alois-belaska.jpg`} />
            <EmployeeName>Alois Bělaška</EmployeeName>
            <EmployeeTitle>Founder</EmployeeTitle>
          </Employee>
        </SectionInner>
      </Section>

      <Section>
        <SectionInner start="xs" center="xs">
          <Col xs={12}>
            <StoryTitle style={{ textAlign: "center" }}>Our Story</StoryTitle>
            <StoryText>
              One day I have discovered the beauty of Google+ and started to
              question the use of other social networks. I{"'"}ve realized, it
              is becoming increasingly harder and time-consuming to manage all
              our social network interactions. At first, I just wanted to
              scratch my itch, but as it turned out, more people have had the
              same problem. I have put my skills as a full stack developer to
              use, and so my first business venture Friends+Me was born.
            </StoryText>
          </Col>
        </SectionInner>
      </Section>

      <Footer />
    </main>
  </ThemeProvider>
);
