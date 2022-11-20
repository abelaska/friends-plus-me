/* global window, document */

import React from "react";
import Head from "next/head";
import styled, { ThemeProvider } from "styled-components";
import ReactTooltip from "react-tooltip";
import { Col, Row } from "react-styled-flexboxgrid";
import { theme } from "../components/Theme";
import { SectionTop, SectionTopInset } from "../components/SectionTop";
import HeaderMenu from "../components/HeaderMenu";
import { Section, SectionInner } from "../components/Section";
import { LinkOutlineButton } from "../components/Link";
import WallOfLoveButton from "../components/WallOfLoveButton";
import Footer from "../components/Footer";
import { Beta } from "../components/Beta";
import { IconQuestionCircle, IconCheckCircle } from "../components/Icons";
import RandomCustomers from "../components/RandomCustomers";

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

const Plan = styled.div`
  padding: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  margin-right: 20px;
  margin-bottom: 20px;
`;

const PlanName = styled.h2`
  text-align: center;
  margin-bottom: 10px;
  font-size: 18px;
`;

const PlanPrice = styled.div`
  text-align: center;
  font-size: 26px;
  margin: 0 0 20px 0;
  font-weight: 100;
`;

const PlanLimits = styled.div`
  text-align: center;
`;

const PlanButtonBase = styled(LinkOutlineButton)`
  font-size: 16px;
  margin-top: 20px;
  padding: 15px 0;
  width: calc(100% - 20px);
  max-width: 250px;
  border: 0;
  background-color: #54b8df;
  color: #fff;

  &:hover {
    background-color: #7fcae7;
  }

  @media (max-width: 1100px) {
    font-size: 14px;
  }
`;

const PlanButton = () => (
  <PlanButtonBase href="https://app.friendsplus.me/signup">
    Start Free Trial
  </PlanButtonBase>
);

const SectionPlansInclude = styled(Section)`
  background-color: rgba(0, 0, 0, 0.02);
  margin-top: 50px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  padding: 10px 0px;
`;

const PricingTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Pricing = styled.div`
  width: 90%;
  min-width: 630px;
  margin: 0 auto;
  padding: 20px;

  background-color: #fff;
  box-shadow: 0 1px 30px rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  margin-top: 20px;
  margin-bottom: 50px;
`;

const PlanName2 = styled.div`
  text-align: center;
  color: #2c2d30;
  font-size: 1.5rem;
  font-weight: 900;
  border-left: 1px solid #cfcfd0;
`;

const PlanPrice2 = styled.div`
  font-size: 4.5rem;
  line-height: 4.5rem;
  padding-top: 1.5rem;
  font-weight: 900;
  color: #2c2d30;
  position: relative;
  margin-left: -1rem;

  span.currency {
    position: relative;
    top: -1.66rem;
    color: #a0a0a2;
    font-size: 28px;
    font-weight: 400;
  }

  span.cents {
    position: absolute;
    top: 1.2rem;
    font-size: 1.7rem;
    letter-spacing: -1px;
    font-weight: 500;
    line-height: 4.5rem;
  }

  @media (max-width: 1100px) {
    font-size: 2.5rem;
    span.currency {
      top: -0.7rem;
      font-size: 20px;
    }
    span.cents {
      font-size: 1.2rem;
    }
  }
`;

const PlanPriceDetail = styled.div`
  font-size: 0.875rem;
  line-height: 1rem;
  opacity: 0.8;
  color: #2c2d30;
  font-weight: 400;
  padding: 0 0.5rem;

  div {
    margin-top: 0.5rem;
  }
`;

const PricingTableCell = styled.td`
  width: 16%;
  color: #2c2d30;
  text-align: center;
`;

const PricingTablePlanWithLeftBorder = styled(PricingTableCell)`
  border-left: 1px solid #cfcfd0;
`;

const PricingTablePlan = styled(PricingTablePlanWithLeftBorder)`
  vertical-align: top;
  h3 {
    font-size: 1.5rem;
    line-height: 1.75rem;
    margin-bottom: 0;
  }
`;

const PricingTablePlanPurpose = styled(PricingTablePlanWithLeftBorder)`
  padding-top: 20px;
  vertical-align: top;

  p {
    font-size: 14px;
    padding: 0 0.5rem;
  }
`;

const PricingTableOurPlans = styled.div`
  background-color: #42c299;
  padding: 0.9rem 1.4rem;
  color: #fff;
  font-size: 26px;
  font-weight: 700;
  text-align: right;
  position: absolute;
  left: -30px;
  top: 80px;

  &::before {
    content: "";
    display: block;
    width: 0;
    height: 0;
    border-top: 16px solid transparent;
    border-bottom: 16px solid transparent;
    border-left: 16px solid #358a6f;
    position: absolute;
    -webkit-transform: scaleY(0.8) rotate(45deg);
    -moz-transform: scaleY(0.8) rotate(45deg);
    -ms-transform: scaleY(0.8) rotate(45deg);
    transform: scaleY(0.8) rotate(45deg);
    top: -20px;
    left: 9px;
    z-index: -1;
  }
`;

const PricingTablePlanFeatureLine = styled.tr`
  border-top: 1px solid #cfcfd0;
`;

const PricingTablePlanFeatures = styled(PricingTableCell)`
  position: relative;
  text-align: left;
  padding: 20px;
  border-right: 1px solid #cfcfd0;
  line-height: 1.5rem;
`;

const PricingTablePlanFeaturesHighlight = styled.tr`
  background-color: #f5f5f5;

  td {
    font-weight: 500;
    padding: 20px;
    text-align: left;
  }
`;

const PricingTablePlanFeature = styled(PricingTableCell)`
  border-right: 1px solid #cfcfd0;
  &:last-of-type {
    border-right: 0;
  }
`;

const PricingTablePlanFeatureChecked = styled(PricingTablePlanFeature)`
  font-size: 20px;
`;

const Checked = () => (
  <IconCheckCircle stroke="#42c299" svg={{ strokeWidth: "3" }} />
);

const FeatureAvailable = () => (
  <PricingTablePlanFeature>
    <Checked />
  </PricingTablePlanFeature>
);

const InstagramQueueIncluded = styled.p`
  margin: 0;
  font-size: 12px;
`;

const PricingTablePlanFeaturesNoWrap = styled(PricingTablePlanFeatures)`
  white-space: nowrap;
  min-width: 120px;
`;

// const IconRow = styled(Row)`
//   white-space: 'nowrap';
//   span.fa-stack {
//     font-size: 12px;
//   }
//   div {
//     font-size: 15px;
//   }
// `;

// const IconAndNames = ({ iconName, iconColor = '#fff', iconBg = '#000', lines = [] }) => (
//   <IconRow start="xs" middle="xs">
//     <span className="fa-stack fa-lg">
//       <FontAwesome name="circle" stack="2x" style={{ color: iconBg }} />
//       <FontAwesome name={iconName} stack="1x" style={{ color: iconColor }} />
//     </span>
//     <Col start="xs" start="xs" style={{ marginLeft: 5 }}>
//       {lines.map(l => <div key={l}>{l}</div>)}
//     </Col>
//   </IconRow>
// );

// const GooglePlusLines = ({ lines }) =>
//   IconAndNames({ iconName: 'google-plus', iconBg: '#dd4b39', lines: lines || ['Google+'] });

const PricingAdditional = styled(Pricing)`
  width: 50%;
  @media (max-width: 768px) {
    width: 90%;
  }
`;

const Question = ({ tooltip }) => (
  <span
    style={{
      position: "relative",
      marginLeft: 5,
    }}
  >
    <IconQuestionCircle
      stroke="#bbb"
      svg={{ strokeWidth: "2" }}
      style={{ cursor: "help", position: "absolute", top: 0 }}
      data-tip={tooltip}
    />
  </span>
);

const TopPricing = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  background-color: #54b8df;
  color: #fff;
  z-index: 1000;
  transition: all 0.2s ease-out 0s;

  .inner {
    width: 90%;
    margin: 0 auto;
  }

  &,
  &.hide {
    top: -60px;
    opacity: 0;
  }

  @media (min-width: 1080px) {
    &.show {
      top: 0;
      opacity: 1;
    }
  }
`;

const TopPricingColumn = styled(PricingTableCell)`
  padding: 20px 10px;
  font-size: 16px;
  font-weight: 500;
  color: ##2c2d30;
  border-right: 1px solid rgba(42, 80, 117, 0.2);
`;

const TopPricingPlan = styled(TopPricingColumn)`
  color: #fff;
  border-right: 1px solid rgba(42, 80, 117, 0.2);
  &:last-of-type {
    border-right: 0;
  }
`;

class PricingPage extends React.Component {
  constructor(...args) {
    super(...args);
    this.didScroll = 0;
    this.didScrollInterval = null;
    this.scrollHandler = this.handleScroll.bind(this);
  }

  componentDidMount() {
    window.addEventListener("scroll", this.scrollHandler);

    this.handleScroll();
    this.didScrollInterval = setInterval(() => {
      if (this.didScroll) {
        this.setState({ scrollTop: this.didScroll });
        this.didScroll = 0;
      }
    }, 300);
  }

  componentWillUnmount() {
    window.removeEventListener("scroll", this.scrollHandler);

    if (this.didScrollInterval) {
      clearInterval(this.didScrollInterval);
      this.didScrollInterval = null;
    }
  }

  handleScroll() {
    this.didScroll =
      window.pageYOffset || (document && document.documentElement.scrollTop);
  }

  render() {
    const { scrollTop } = this.state || {};
    const isTopPricingVisible = scrollTop > 590 && scrollTop < 2400;
    return (
      <ThemeProvider theme={theme}>
        <main>
          <Head>
            <title>Friends+Me Pricing</title>
          </Head>

          <SectionTop style={{ minHeight: 450 }}>
            <SectionTopInset>
              <HeaderMenu />
              <HeaderContent center="xs">
                <Col xs={12}>
                  <Title>
                    You
                    {"'"}
                    ll love us, we guarantee it.
                  </Title>
                  <h2>
                    Find the plan that
                    {"'"}s right for you.
                  </h2>
                </Col>
              </HeaderContent>
            </SectionTopInset>
          </SectionTop>

          <TopPricing className={isTopPricingVisible ? "show" : "hide"}>
            <div className="inner">
              <PricingTable cellPadding="0" cellSpacing="0">
                <tbody>
                  <tr>
                    <TopPricingColumn>Our Plans:</TopPricingColumn>
                    <TopPricingPlan>Free</TopPricingPlan>
                    <TopPricingPlan>Individual</TopPricingPlan>
                    <TopPricingPlan>Small</TopPricingPlan>
                    <TopPricingPlan>Medium</TopPricingPlan>
                    <TopPricingPlan>Large</TopPricingPlan>
                  </tr>
                </tbody>
              </PricingTable>
            </div>
          </TopPricing>

          <Pricing>
            <PricingTable cellPadding="0" cellSpacing="0">
              <tbody>
                <tr>
                  <PricingTablePlanFeatures>
                    <PricingTableOurPlans>Our Plans</PricingTableOurPlans>
                  </PricingTablePlanFeatures>
                  <PricingTablePlan>
                    <h3>Free</h3>
                    <PlanPrice2>
                      <span className="currency">$</span>0
                    </PlanPrice2>
                  </PricingTablePlan>
                  <PricingTablePlan>
                    <h3>Individual</h3>
                    <PlanPrice2>
                      <span className="currency">$</span>7
                      <span className="cents">50</span>
                    </PlanPrice2>
                  </PricingTablePlan>
                  <PricingTablePlan>
                    <h3>Small</h3>
                    <PlanPrice2>
                      <span className="currency">$</span>
                      24
                      <span className="cents">17</span>
                    </PlanPrice2>
                  </PricingTablePlan>
                  <PricingTablePlan>
                    <h3>Medium</h3>
                    <PlanPrice2>
                      <span className="currency">$</span>
                      49
                      <span className="cents">17</span>
                    </PlanPrice2>
                  </PricingTablePlan>
                  <PricingTablePlan>
                    <h3>Large</h3>
                    <PlanPrice2>
                      <span className="currency">$</span>
                      215
                      <span className="cents">84</span>
                    </PlanPrice2>
                  </PricingTablePlan>
                </tr>
                <tr>
                  <PricingTableCell />
                  <PricingTablePlanWithLeftBorder>
                    &nbsp;
                  </PricingTablePlanWithLeftBorder>
                  <PricingTablePlanWithLeftBorder>
                    <PlanPriceDetail>
                      per month billed annually
                      <div>$9 if billed monthly</div>
                    </PlanPriceDetail>
                  </PricingTablePlanWithLeftBorder>
                  <PricingTablePlanWithLeftBorder>
                    <PlanPriceDetail>
                      per month billed annually
                      <div>$29 if billed monthly</div>
                    </PlanPriceDetail>
                  </PricingTablePlanWithLeftBorder>
                  <PricingTablePlanWithLeftBorder>
                    <PlanPriceDetail>
                      per month billed annually
                      <div>$59 if billed monthly</div>
                    </PlanPriceDetail>
                  </PricingTablePlanWithLeftBorder>
                  <PricingTablePlanWithLeftBorder>
                    <PlanPriceDetail>
                      per month billed annually
                      <div>$259 if billed monthly</div>
                    </PlanPriceDetail>
                  </PricingTablePlanWithLeftBorder>
                </tr>
                <tr>
                  <PricingTableCell />
                  <PricingTablePlanWithLeftBorder>
                    <PlanButton />
                  </PricingTablePlanWithLeftBorder>
                  <PricingTablePlanWithLeftBorder>
                    <PlanButton />
                  </PricingTablePlanWithLeftBorder>
                  <PricingTablePlanWithLeftBorder>
                    <PlanButton />
                  </PricingTablePlanWithLeftBorder>
                  <PricingTablePlanWithLeftBorder>
                    <PlanButton />
                  </PricingTablePlanWithLeftBorder>
                  <PricingTablePlanWithLeftBorder>
                    <PlanButton />
                  </PricingTablePlanWithLeftBorder>
                </tr>
                <tr>
                  <PricingTableCell />
                  <PricingTablePlanPurpose>
                    <p>
                      For individuals, or anyone who wants to try Friends+Me for
                      an unlimited period of time.
                    </p>
                  </PricingTablePlanPurpose>
                  <PricingTablePlanPurpose>
                    <p>For small teams and individuals.</p>
                  </PricingTablePlanPurpose>
                  <PricingTablePlanPurpose colSpan="3">
                    <p>
                      For teams and businesses ready to rule their social media
                      empire.
                    </p>
                  </PricingTablePlanPurpose>
                </tr>
                <PricingTablePlanFeatureLine>
                  <PricingTablePlanFeatures>
                    Queues{" "}
                    <Question tooltip="<p><b>What is Queue?</b><br/><br/>Queue is a destination where you'd<br/>like to publish your posts, like<br/>Facebook page, Twitter profile,<br/>Pinterest Board...</p>" />
                  </PricingTablePlanFeatures>
                  <PricingTablePlanFeature>2</PricingTablePlanFeature>
                  <PricingTablePlanFeature>5</PricingTablePlanFeature>
                  <PricingTablePlanFeature>15</PricingTablePlanFeature>
                  <PricingTablePlanFeature>30</PricingTablePlanFeature>
                  <PricingTablePlanFeature>120</PricingTablePlanFeature>
                </PricingTablePlanFeatureLine>
                <PricingTablePlanFeatureLine>
                  <PricingTablePlanFeatures>
                    Scheduled Posts per Queue{" "}
                    <Question tooltip="<p>The number of posts you can have scheduled<br>in a queue at any time.<br><br>There is no daily, monthly, or yearly limit.</p>" />
                  </PricingTablePlanFeatures>
                  <PricingTablePlanFeature>5</PricingTablePlanFeature>
                  <PricingTablePlanFeature>500</PricingTablePlanFeature>
                  <PricingTablePlanFeature>1500</PricingTablePlanFeature>
                  <PricingTablePlanFeature>3000</PricingTablePlanFeature>
                  <PricingTablePlanFeature>5000</PricingTablePlanFeature>
                </PricingTablePlanFeatureLine>
                <PricingTablePlanFeatureLine>
                  <PricingTablePlanFeatures>
                    Additional Team Members
                  </PricingTablePlanFeatures>
                  <PricingTablePlanFeature>1</PricingTablePlanFeature>
                  <PricingTablePlanFeature>10</PricingTablePlanFeature>
                  <PricingTablePlanFeature>20</PricingTablePlanFeature>
                  <PricingTablePlanFeature>30</PricingTablePlanFeature>
                  <PricingTablePlanFeature>50</PricingTablePlanFeature>
                </PricingTablePlanFeatureLine>
                <PricingTablePlanFeaturesHighlight>
                  <td colSpan="6">
                    Social Networks and Other Platforms You Can Publish to with
                    Friends+Me
                  </td>
                </PricingTablePlanFeaturesHighlight>
                {/* <PricingTablePlanFeatureLine style={{ borderTop: 0 }}>
                  <PricingTablePlanFeatures>
                    <div>Google+ Profiles</div>
                    <div>Google+ Pages</div>
                    <div>Google+ Collections</div>
                    <div>
                      Google+ Communities <Beta />
                    </div>
                    <div>
                      GSuite Google+ <Beta />
                    </div>
                  </PricingTablePlanFeatures>
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                </PricingTablePlanFeatureLine> */}
                <PricingTablePlanFeatureLine>
                  <PricingTablePlanFeatures>
                    <div>Facebook Pages</div>
                    {/* <div>Facebook Groups</div> */}
                  </PricingTablePlanFeatures>
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                </PricingTablePlanFeatureLine>
                <PricingTablePlanFeatureLine>
                  <PricingTablePlanFeatures>
                    <div>Linkedin Profiles</div>
                    <div>Linkedin Company Pages</div>
                  </PricingTablePlanFeatures>
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                </PricingTablePlanFeatureLine>
                <PricingTablePlanFeatureLine>
                  <PricingTablePlanFeatures>Twitter</PricingTablePlanFeatures>
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                </PricingTablePlanFeatureLine>
                <PricingTablePlanFeatureLine>
                  <PricingTablePlanFeatures>Tumblr</PricingTablePlanFeatures>
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                </PricingTablePlanFeatureLine>
                <PricingTablePlanFeatureLine>
                  <PricingTablePlanFeatures>Pinterest</PricingTablePlanFeatures>
                  <PricingTablePlanFeature>-</PricingTablePlanFeature>
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                </PricingTablePlanFeatureLine>
                {/* <PricingTablePlanFeatureLine>
                  <PricingTablePlanFeatures>
                    Instagram <Beta />
                  </PricingTablePlanFeatures>
                  <PricingTablePlanFeature>-</PricingTablePlanFeature>
                  <PricingTablePlanFeature>
                    <Checked />
                    <InstagramQueueIncluded>Instagram queues paid extra</InstagramQueueIncluded>
                  </PricingTablePlanFeature>
                  <PricingTablePlanFeature>
                    <Checked />
                    <InstagramQueueIncluded>Instagram queues paid extra</InstagramQueueIncluded>
                  </PricingTablePlanFeature>
                  <PricingTablePlanFeature>
                    <Checked />
                    <InstagramQueueIncluded>
                      <b>1</b> Instagram queue for free
                    </InstagramQueueIncluded>
                  </PricingTablePlanFeature>
                  <PricingTablePlanFeature>
                    <Checked />
                    <InstagramQueueIncluded>
                      <b>10</b> Instagram queues for free
                    </InstagramQueueIncluded>
                  </PricingTablePlanFeature>
                </PricingTablePlanFeatureLine> */}
                <PricingTablePlanFeaturesHighlight>
                  <td colSpan="6">Advanced Publishing / Scheduling</td>
                </PricingTablePlanFeaturesHighlight>
                <PricingTablePlanFeatureLine style={{ borderTop: 0 }}>
                  <PricingTablePlanFeatures>
                    Link Shortening{" "}
                    <Question tooltip="<p>We support <b>Bit.ly</b> + <b>Goo.gl</b> link shorteners.</p>" />
                  </PricingTablePlanFeatures>
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                </PricingTablePlanFeatureLine>
                <PricingTablePlanFeatureLine>
                  <PricingTablePlanFeatures>
                    Bulk Scheduling
                  </PricingTablePlanFeatures>
                  <PricingTablePlanFeature>-</PricingTablePlanFeature>
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                </PricingTablePlanFeatureLine>
                <PricingTablePlanFeaturesHighlight>
                  <td colSpan="6">Schedule as You Discover</td>
                </PricingTablePlanFeaturesHighlight>
                <PricingTablePlanFeatureLine style={{ borderTop: 0 }}>
                  <PricingTablePlanFeatures>
                    Browser Extension{" "}
                    <Question tooltip="<p>We offer extension for <b>Safari</b> + <b>Chrome</b> + <b>Firefox</b> + <b>Opera</b> browsers.</p>" />
                  </PricingTablePlanFeatures>
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                </PricingTablePlanFeatureLine>
                <PricingTablePlanFeatureLine>
                  <PricingTablePlanFeatures>
                    Mobile App{" "}
                    <Question tooltip="<p>We offer <b>iOS</b> + <b>Android</b> mobile applications.</p>" />
                  </PricingTablePlanFeatures>
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                </PricingTablePlanFeatureLine>
                <PricingTablePlanFeatureLine>
                  <PricingTablePlanFeatures>
                    Desktop App{" "}
                    <Question tooltip="<p>We offer desktop application for <b>MacOS</b> + <b>Windows</b> + <b>Linux</b> operation systems.</p>" />
                  </PricingTablePlanFeatures>
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                </PricingTablePlanFeatureLine>
                <PricingTablePlanFeaturesHighlight>
                  <td colSpan="6">3rd Party Integrations</td>
                </PricingTablePlanFeaturesHighlight>
                <PricingTablePlanFeatureLine style={{ borderTop: 0 }}>
                  <PricingTablePlanFeatures>
                    Zapier <Beta />
                  </PricingTablePlanFeatures>
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                  <FeatureAvailable />
                </PricingTablePlanFeatureLine>
                <PricingTablePlanFeaturesHighlight>
                  <td colSpan="6">Other Benefits</td>
                </PricingTablePlanFeaturesHighlight>
                <PricingTablePlanFeatureLine style={{ borderTop: 0 }}>
                  <PricingTablePlanFeatures>Support</PricingTablePlanFeatures>
                  <PricingTablePlanFeature>
                    Standard Support
                  </PricingTablePlanFeature>
                  <PricingTablePlanFeature>
                    Priority Support
                  </PricingTablePlanFeature>
                  <PricingTablePlanFeature>
                    Priority Support
                  </PricingTablePlanFeature>
                  <PricingTablePlanFeature>
                    Priority Support
                  </PricingTablePlanFeature>
                  <PricingTablePlanFeature>
                    Priority Support
                  </PricingTablePlanFeature>
                </PricingTablePlanFeatureLine>
                <tr>
                  <PricingTableCell />
                  <PricingTablePlanWithLeftBorder>
                    <PlanButton />
                  </PricingTablePlanWithLeftBorder>
                  <PricingTablePlanWithLeftBorder>
                    <PlanButton />
                  </PricingTablePlanWithLeftBorder>
                  <PricingTablePlanWithLeftBorder>
                    <PlanButton />
                  </PricingTablePlanWithLeftBorder>
                  <PricingTablePlanWithLeftBorder>
                    <PlanButton />
                  </PricingTablePlanWithLeftBorder>
                  <PricingTablePlanWithLeftBorder>
                    <PlanButton />
                  </PricingTablePlanWithLeftBorder>
                </tr>
              </tbody>
            </PricingTable>
          </Pricing>

          <Section style={{ marginTop: 50 }}>
            <SectionInner start="xs" center="xs">
              <Col xs={12}>
                <h3 style={{ textAlign: "center" }}>Pay for what you use</h3>
                <h4 style={{ textAlign: "center" }}>
                  If you add more queues than you have paid for, you will be
                  monthly charged a small fee for the additional on-demand
                  queues.
                </h4>
                <PricingAdditional>
                  <PricingTable cellPadding="0" cellSpacing="0">
                    <tbody>
                      <PricingTablePlanFeatureLine style={{ borderTop: 0 }}>
                        <PricingTablePlanFeatures>
                          &nbsp;
                        </PricingTablePlanFeatures>
                        <td style={{ fontWeight: 600, textAlign: "center" }}>
                          A Small Monthly Fee per Additional Queue
                        </td>
                      </PricingTablePlanFeatureLine>
                      <PricingTablePlanFeatureLine>
                        <PricingTablePlanFeatures>
                          {/* <div>Google+</div> */}
                          <div>Facebook</div>
                          <div>Linkedin</div>
                          <div>Twitter</div>
                          <div>Tumblr</div>
                          <div>Pinterest</div>
                        </PricingTablePlanFeatures>
                        <td style={{ textAlign: "center" }}>$2.99</td>
                      </PricingTablePlanFeatureLine>
                      {/* <PricingTablePlanFeatureLine>
                        <PricingTablePlanFeatures style={{ whiteSpace: 'nowrap' }}>
                          Instagram <Beta />
                        </PricingTablePlanFeatures>
                        <td>$12.99</td>
                      </PricingTablePlanFeatureLine> */}
                    </tbody>
                  </PricingTable>
                </PricingAdditional>
              </Col>
            </SectionInner>
          </Section>

          <SectionPlansInclude>
            <SectionInner center="xs" style={{ paddingTop: 20 }}>
              <Col xs={12}>
                <h3 style={{ textAlign: "center" }}>
                  Need a larger plan or a higher level of support?
                </h3>
                <h4 style={{ textAlign: "center" }}>
                  Don
                  {"'"}t know which plan is right for you?
                </h4>
              </Col>
              <div
                style={{
                  textAlign: "left",
                  lineHeight: "1.2em",
                  color: "rgba(0,0,0,0.7)",
                }}
              >
                <a
                  href="mailto:billing@friendsplus.me"
                  style={{ color: "#2693d5" }}
                >
                  Send us an email
                </a>
              </div>
            </SectionInner>
          </SectionPlansInclude>

          <Section style={{ paddingTop: 50, margin: 0 }}>
            <SectionInner start="xs" center="xs">
              <Col xs={12}>
                <h3 style={{ textAlign: "center" }}>Happy Customers</h3>
                <RandomCustomers />
                <WallOfLoveButton />
              </Col>
            </SectionInner>
          </Section>

          <Footer />

          <ReactTooltip place="top" type="dark" effect="solid" html={true} />
        </main>
      </ThemeProvider>
    );
  }
}

export default PricingPage;
