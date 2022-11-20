import React from "react";
import Head from "next/head";
import styled, { ThemeProvider } from "styled-components";
import { Col, Row } from "react-styled-flexboxgrid";
import { theme } from "../components/Theme";
import { LinkOutlineButton } from "../components/Link";
import HeaderMenu from "../components/HeaderMenu";
import { SectionTop, SectionTopInset } from "../components/SectionTop";
import Image from "../components/Image";
import { customerByName } from "../components/Customers";
import Endorsement from "../components/Endorsement";
import StartFilledButton from "../components/StartFilledButton";
import { Section, SectionInner } from "../components/Section";
import WallOfLoveButton from "../components/WallOfLoveButton";
import Footer from "../components/Footer";
import { Beta } from "../components/Beta";
import RandomCustomers from "../components/RandomCustomers";
import {
  IconGooglePlus,
  IconFacebook,
  IconTwitter,
  IconLinkedin,
  IconTumblr,
  IconPinterest,
  IconInstagram,
} from "../components/Icons";

const StartButton = styled(LinkOutlineButton)`
  font-size: 20px;
  padding: 15px 30px;
`;

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
    color: rgba(255, 255, 255, 0.6);
    font-size: 1.3125rem;
    font-weight: 100;
    margin: 3rem 0 4.6875rem;

    > span {
      color: #fff;
      font-weight: 400;
    }
  }
`;

const SectionFeatures = styled.section`
  width: 100%;
  height: auto;
  position: relative;
  background: #fff;
  overflow: hidden;
  padding: 120px 0 50px 0;

  &:before {
    content: "";
    position: absolute;
    left: -2rem;
    bottom: -10rem;
    width: calc(100% + 4rem);
    height: calc(100% + 5rem);

    background: -webkit-linear-gradient(-410deg, #0f3966 10%, #54b8df 90%);
    background: linear-gradient(140deg, #0f3966 10%, #54b8df 90%);

    -webkit-transform: rotate(3deg);
    transform: rotate(3deg);
  }
`;

const SectionFeaturesInner = styled(SectionInner)`
  h3,
  h4 {
    color: #fff;
    text-align: center;
  }
  h4 {
    color: rgba(255, 255, 255, 0.6);
  }
`;

const Features = styled(Row)`
  margin-top: 50px;
`;

const Feature = styled.div`
  color: rgba(255, 255, 255, 0.9);
  text-align: left;
  margin: 10px;

  h5 {
    margin: 0;
    font-size: 20px;
    margin-bottom: 5px;
  }

  h6 {
    margin: 0;
    font-size: 15px;
    font-weight: 100;
  }
`;

const SocialIcon = styled(Row)`
  color: #fff;
  background-color: #54b8df;
  border-radius: 50%;
  height: 42px;
  width: 42px;
  font-size: 22px;
  margin-right: 10px;
  margin-bottom: 10px;
`;

const SocialIconTitle = styled(Row)`
  color: rgba(255, 255, 255, 0.7);
  font-size: 22px;
`;

const ImageColLeft = styled(Col)`
  padding-right: 50px;

  @media (max-width: 767px) {
    padding-right: 0;
  }
`;

const ImageColRight = styled(Col)`
  padding-left: 50px;

  @media (max-width: 767px) {
    padding-left: 0;
  }
`;

const Link = styled.a`
  color: #0f3966;

  &:hover {
    opacity: 0.8;
  }
`;

const IconTitleArgs = {
  fill: "#fff",
  opacity: "0.7",
  style: { width: 20, height: 20 },
};

const GooglePlusIconTitle = () => (
  <Row center="xs" middle="xs">
    <IconGooglePlus {...IconTitleArgs} />
  </Row>
);

const FacebookIconTitle = () => (
  <Row center="xs" middle="xs">
    <IconFacebook {...IconTitleArgs} />
  </Row>
);

const TwitterIconTitle = () => (
  <Row center="xs" middle="xs">
    <IconTwitter {...IconTitleArgs} />
  </Row>
);

const LinkedinIconTitle = () => (
  <Row center="xs" middle="xs">
    <IconLinkedin {...IconTitleArgs} />
  </Row>
);

const TumblrIconTitle = () => (
  <Row center="xs" middle="xs">
    <IconTumblr {...IconTitleArgs} />
  </Row>
);

const PinterestIconTitle = () => (
  <Row center="xs" middle="xs">
    <IconPinterest {...IconTitleArgs} />
  </Row>
);

const InstagramIconTitle = () => (
  <Row center="xs" middle="xs">
    <IconInstagram {...IconTitleArgs} />
  </Row>
);

const SocialIconArgs = {
  fill: "#fff",
  style: { width: 24, height: 24 },
};

const GooglePlusSocialIcon = () => (
  <SocialIcon center="xs" middle="xs">
    <IconGooglePlus {...SocialIconArgs} />
  </SocialIcon>
);

const FacebookSocialIcon = () => (
  <SocialIcon center="xs" middle="xs">
    <IconFacebook {...SocialIconArgs} />
  </SocialIcon>
);

const TwitterSocialIcon = () => (
  <SocialIcon center="xs" middle="xs">
    <IconTwitter {...SocialIconArgs} />
  </SocialIcon>
);

const LinkedinSocialIcon = () => (
  <SocialIcon center="xs" middle="xs">
    <IconLinkedin {...SocialIconArgs} />
  </SocialIcon>
);

const TumblrSocialIcon = () => (
  <SocialIcon center="xs" middle="xs">
    <IconTumblr {...SocialIconArgs} />
  </SocialIcon>
);

const PinterestSocialIcon = () => (
  <SocialIcon center="xs" middle="xs">
    <IconPinterest {...SocialIconArgs} />
  </SocialIcon>
);

const InstagramSocialIcon = () => (
  <SocialIcon center="xs" middle="xs">
    <IconInstagram {...SocialIconArgs} />
  </SocialIcon>
);

export default () => (
  <ThemeProvider theme={theme}>
    <main>
      <Head>
        <title>Friends+Me: Share to ANYWHERE</title>
      </Head>

      <SectionTop>
        <SectionTopInset>
          <HeaderMenu />
          <HeaderContent center="xs">
            <Col xs={12} sm={5}>
              <Title>
                Share to <strong>ANYWHERE</strong>
              </Title>
              <Row center="xs" middle="xs">
                <Row
                  style={{ width: "80%" }}
                  around="xs"
                  center="xs"
                  middle="xs"
                >
                  {/* <GooglePlusIconTitle /> */}
                  <FacebookIconTitle />
                  <TwitterIconTitle />
                  <LinkedinIconTitle />
                  <TumblrIconTitle />
                  <PinterestIconTitle />
                  {/* <InstagramIconTitle /> */}
                </Row>
              </Row>
              <h2>
                <span>
                  Publish at the right time, reach more customers and increase
                  engagement.
                </span>{" "}
                Because sharing is caring.
              </h2>
              {/* <StartButton href="https://app.friendsplus.me/signup">
                Start Scheduling Content
              </StartButton> */}
            </Col>
            <Col xs={12} sm={7} style={{ padding: 50 }}>
              <Image src={`/static/screenshots/main.jpg`} alt="Friends+Me" />
            </Col>
          </HeaderContent>
        </SectionTopInset>
      </SectionTop>

      <Section>
        <SectionInner reverse="xs">
          <Col xs={12} sm={5} style={{ marginBottom: 50 }}>
            <h3>Schedule Your Social Media Content</h3>
            <h4>
              You don’t have to publish your post right away,{" "}
              <b>schedule your posts for later</b>. Posting at the right time
              will help you to <b>reach more of your followers</b> across the
              globe.
            </h4>
            <Row style={{ marginBottom: 20 }}>
              {/* <GooglePlusSocialIcon /> */}
              <FacebookSocialIcon />
              <TwitterSocialIcon />
              <LinkedinSocialIcon />
              <TumblrSocialIcon />
              <PinterestSocialIcon />
              {/* <InstagramSocialIcon /> */}
            </Row>

            <Endorsement
              customer={customerByName("Ian Anderson Gray")}
              short={true}
            />
          </Col>
          <ImageColLeft xs={12} sm={7}>
            <Image src={`/static/screenshots/timeline.jpg`} alt="Friends+Me" />
          </ImageColLeft>
        </SectionInner>
      </Section>

      {/* <Section style={{ marginTop: 100 }}>
        <SectionInner>
          <Col xs={12} sm={5} style={{ marginBottom: 50 }}>
            <h3>
              Save yourself{' '}
              <b>
                Instagram<Beta />
              </b>{' '}
              headaches
            </h3>
            <h4>
              We will publish your posts for you, <b>no phone required</b>, <b>no annoying post reminders</b> anymore.{' '}
              <br />
              <br />
              Friends+Me posts using physical real-world Android phones, all running latest official Instagram
              application. No Instagram private API is used, <b>we are inline with Instagram's terms and conditions</b>.
            </h4>
            <Endorsement customer={customerByName('Wade Harman')} short={true} />
          </Col>
          <ImageColRight xs={12} sm={7}>
            <Image src={`/static/screenshots/instagram.jpg`} alt="Friends+Me" />
          </ImageColRight>
        </SectionInner>
      </Section> */}

      <Section style={{ marginTop: 100 }}>
        <SectionInner>
          <Col xs={12} sm={5} style={{ marginBottom: 50 }}>
            <h3>Collect and Create Great Content</h3>
            <h4>
              We will help you to{" "}
              <b>stay focused on the creation of great content</b> to share.
              Stay organized.
            </h4>
            <Endorsement
              customer={customerByName("Ben Johnston")}
              short={true}
            />
          </Col>
          <ImageColRight xs={12} sm={7}>
            <Image src={`/static/screenshots/draft.jpg`} alt="Friends+Me" />
          </ImageColRight>
        </SectionInner>
      </Section>

      <SectionFeatures>
        <SectionFeaturesInner center="xs">
          <Col xs={12} style={{ marginTop: 50 }}>
            <h3 style={{ textAlign: "center" }}>More Great Features</h3>
            <h4 style={{ textAlign: "center" }}>
              More ways Friends+Me can help you simplify your social media
              tasks.
            </h4>
            <Features center="xs">
              <Col xs={10} sm={5}>
                <Feature>
                  <h5>Mobile Applications</h5>
                  <h6>
                    Work from anywhere with our mobile iOS and Android apps
                  </h6>
                </Feature>
              </Col>
              <Col xs={10} sm={5}>
                <Feature>
                  <h5>Browser Extensions</h5>
                  <h6>Save content from anywhere on the web for later</h6>
                </Feature>
              </Col>
              <Col xs={10} sm={5}>
                <Feature>
                  <h5>Desktop Application</h5>
                  <h6>
                    Save browser tabs, use our MacOS, Windows, and Linux desktop
                    apps
                  </h6>
                </Feature>
              </Col>
              {/* <Col xs={10} sm={5}>
                <Feature>
                  <h5>Content Cross-Promotion</h5>
                  <h6>
                    Publish once, save time with cross-Promotion of Google+
                    posts
                  </h6>
                </Feature>
              </Col> */}
              <Col xs={10} sm={5}>
                <Feature>
                  <h5>Draft Support</h5>
                  <h6>
                    Make your posts perfect, take the time and publish when
                    ready
                  </h6>
                </Feature>
              </Col>
              <Col xs={10} sm={5}>
                <Feature>
                  <h5>Team Support</h5>
                  <h6>
                    Invite your co-workers and friends to help you to publish
                    great content
                  </h6>
                </Feature>
              </Col>
              <Col xs={10} sm={5}>
                <Feature>
                  <h5>Link Shortening</h5>
                  <h6>Track your posts success</h6>
                </Feature>
              </Col>
              <Col xs={10} sm={5}>
                <Feature>
                  <h5>Bulk Schedule</h5>
                  <h6>Schedule bulk of posts with just with one click</h6>
                </Feature>
              </Col>
              <Col xs={10} sm={5}></Col>
            </Features>
          </Col>
        </SectionFeaturesInner>
      </SectionFeatures>

      <Section>
        <SectionInner center="xs">
          <Col xs={12} sm={true} md={true} lg={true}>
            <h3 style={{ textAlign: "center" }}>SEO Benefits</h3>
            <h4
              style={{
                textAlign: "center",
                padding: "0 20px",
                fontWeight: 100,
              }}
            >
              <b style={{ fontWeight: 400 }}>
                Focus on creation of great content
              </b>{" "}
              to share, that{"'"}s the best thing you can do to{" "}
              <b style={{ fontWeight: 400 }}>increase your brand visibility</b>{" "}
              on the Internet.
            </h4>
          </Col>
          {/* <Col xs={12} sm={true} md={true} lg={true}>
            <h3 style={{ textAlign: "center" }}>Cross-Promotion Workflow</h3>
            <h4
              style={{
                textAlign: "center",
                padding: "0 20px",
                fontWeight: 100,
              }}
            >
              Friends+Me helps you to focus on Google+ to{" "}
              <b style={{ fontWeight: 400 }}>
                save a significant amount of money and time while still
                achieving goals
              </b>{" "}
              by cross-promoting your content across all social networks for
              you.
            </h4>
          </Col> */}
        </SectionInner>
      </Section>

      <Section
        style={{
          borderTop: "1px solid rgba(0,0,0,0.04)",
          paddingTop: 50,
          margin: 0,
        }}
      >
        <SectionInner start="xs" center="xs">
          <Col xs={12}>
            <h3 style={{ textAlign: "center" }}>
              What Our Customers Say About Us
            </h3>
            <h4 style={{ textAlign: "center" }}>
              Beautifully simple, yet immensely effective.
            </h4>
          </Col>
          <StartFilledButton />
          <RandomCustomers />
          <WallOfLoveButton />
        </SectionInner>
      </Section>

      <Footer />
    </main>
  </ThemeProvider>
);
