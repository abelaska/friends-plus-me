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

const Text = styled.p`
  text-align: justify;
  font-size: 18px;
  line-height: 28px;
  color: #50565a;
  margin: 0 0 20px 0;
`;

const Paragraph = styled(Section)`
  margin: 0;
`;

const ParagraphInner = styled(SectionInner)`
  padding-right: 50px;
  padding-left: 50px;
`;

const ParagraphTitle = styled.h3``;
const ParagraphText = styled(Text)`
  margin-left: 30px;

  a {
    color: #2693d5;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

export default () => (
  <ThemeProvider theme={theme}>
    <main>
      <Head>
        <title>Friends+Me Terms</title>
      </Head>

      <SectionTop style={{ minHeight: 400 }}>
        <SectionTopInset>
          <HeaderMenu />
          <HeaderContent center="xs">
            <Col xs={12}>
              <Title>Terms of Service</Title>
              <h2 style={{ fontSize: "1em" }}>
                LAST REVISED ON SEPTEMBER 20, 2017
              </h2>
            </Col>
          </HeaderContent>
        </SectionTopInset>
      </SectionTop>

      <Section style={{ margin: 0 }}>
        <SectionInner start="xs">
          <Col xs={12}>
            <Text style={{ textAlign: "left", fontSize: 20 }}>
              Loysoft Limited
              <br />
              Ground Floor, 13 Cable Court
              <br />
              Pittman Way, Fulwood
              <br />
              Preston, PR2 9YW
              <br />
              United Kingdom
            </Text>
            <h2>The Gist</h2>
            <Text>
              By clicking the Sign-Up button on the sign-up form, you (Customer)
              agree to become bound by the Terms and Conditions of this
              agreement, to the exclusion of all other terms. Please read this
              agreement carefully before using FriendsPlus.me and make sure you
              understand what they say.
            </Text>
            <Text>
              Loysoft Limited is a company incorporated and registered in the
              United Kingdom with number 10410530 whose registered office is at
              Ground Floor, 13 Cable Court, Pittman Way, Fulwood, Preston, PR2
              9YW, United Kingdom. The executive director is Alois Bělaška.
              Loysoft Limited agrees to provide services described in the Order
              for the fees stated in the Order.
            </Text>
          </Col>
        </SectionInner>
      </Section>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>1. General Terms</ParagraphTitle>
            <ParagraphText>
              1.1 The initial service term of this agreement shall begin on the
              date the Customer accepted the terms of the agreement by clicking
              the Sign Up button, i.e. the date on which the Customer first
              order services from the Supplier (Effective Date), and shall
              continue indefinitely unless terminated in accordance with the
              terms of this agreement.
            </ParagraphText>
            <ParagraphText>
              1.2 The Supplier agrees to provide services described in the order
              for the fees stated in the order.
            </ParagraphText>
            <ParagraphText>
              1.3 The Customer agrees to pay the agreed price to the Supplier
              and to provide necessary assistance to the Supplier. The Customer
              represents and warrants to the Supplier that the information he,
              she or it has provided and will provide to the Supplier for
              purposes of establishing and maintaining the service is accurate.
              If the Customer is an individual, the Customer represents and
              warrants to the Supplier that he or she is at least 18 years of
              age.
            </ParagraphText>
            <ParagraphText>
              1.4 The specification of the services governed by this agreement
              is described on the web pages describing the particular service
              the Customer has purchased based on the description as it stands
              on the Effective Date. The Supplier may modify products and
              services from time-to-time. Should the description of services
              change subsequent to the Effective Date, the Supplier has no
              obligation to modify services to reflect such a change.
            </ParagraphText>
            <ParagraphText>
              1.5 The Customer acknowledges that all intellectual property
              rights in the service and any modification belong and shall belong
              to the Supplier, and the Customer shall have no rights in or to
              the service other than the right to use it in accordance with the
              terms of this agreement.
            </ParagraphText>
            <ParagraphText>
              1.6 The Supplier reserves the right to make changes to these terms
              at any time. To the extent the Supplier is able, the Supplier will
              give the Customer advance notice of these changes. If these
              changes materially affect the Customer{"'"}s ability to use
              services, the Customer may terminate this agreement within 30 days
              of such a change. Otherwise, the Customer{"'"}s continued use of
              the service is the Customer{"'"}s consent to be bound by the
              changes.
            </ParagraphText>
            <ParagraphText>
              1.7 In the case of conflict or ambiguity between any provision
              contained in the body of this agreement and any provision
              contained on the Supplier{"'"}s website, the provision in the body
              of this agreement shall take precedence.
            </ParagraphText>
            <ParagraphText>
              1.8 Questions about the terms of this agreement will be answered
              at e-mail address{" "}
              <a href="mailto:support@friendsplus.me">support@friendsplus.me</a>
              .
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>2. Payment</ParagraphTitle>
            <ParagraphText>
              2.1 The Supplier shall provide for each customer the free service
              as a promo for testing for a maximum of 15 days.
            </ParagraphText>
            <ParagraphText>
              2.2 The Supplier may require payment before beginning service.
            </ParagraphText>
            <ParagraphText>
              2.3 The Customer is fully responsible for the accuracy and
              completeness of all data (such as change in billing or mailing
              address, credit card expiration) and timely notification of
              changes of these details. The Supplier is not responsible for any
              misunderstanding resulting from failure to notify of these changes
              by the Customer.
            </ParagraphText>
            <ParagraphText>
              2.4 The Supplier may increase its fees for services, if such a
              change notifies the customer at least thirty (30) days prior to
              the effective date of new fees. The Customer is entitled to
              terminate this Agreement with effect from the fee change. If the
              Customer does not give a notice of non-renewal, the Customer shall
              be deemed to have accepted the new fee.
            </ParagraphText>
            <ParagraphText>
              2.5 The Customer doesn{"'"}t have the right to hold back any
              payment from the Supplier in case of service or availability
              problems.
            </ParagraphText>
            <ParagraphText>
              2.6 The Customer acknowledges that the amount of the fee for the
              service is based on the Customer{"'"}s agreement to pay the fee
              for the entire initial service term, or renewal term, as
              applicable.
              <br />
              <br />
              All charges are non-refundable unless expressly stated otherwise,
              or otherwise provided by applicable law.
            </ParagraphText>
            <ParagraphText>
              2.7 If the Customer believes that there is an error in calculation
              of the fee, the Customer has the right claim settlement prices for
              the service.
            </ParagraphText>
            <ParagraphText>
              2.8 Amounts deposited into account as fees expire in denomination
              expiration period of 365 days. Unused account balance is forfeited
              upon expiration. If money is added to account before the current
              balance expires, the existing balance will carry over to the new
              expiration date. The Supplier reserves the right to cancel
              Customer’s account 180 days after expiration.
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>
              3. Supplier{"'"}s warranties and limits of liability
            </ParagraphTitle>
            <ParagraphText>
              3.1 The Supplier warrants that the service will conform in all
              material respects to the specification. If the Customer notifies
              the Supplier in writing of any defect or fault in the service in
              consequence of which it fails to conform in all material respects
              to the specification, and such defect or fault does not result
              from the Customer, or anyone acting with the authority of the
              Customer, having used the service outside the terms of this
              agreement, for a purpose or in a context other than the purpose or
              context for which it was designed, the Supplier shall, at the
              Supplier{"'"}s option, do one of the following: a) replace the
              service; or b) repair the service; or c) terminate this agreement
              immediately by notice in writing to the Customer and refund any of
              the fee paid by the Customer as at the date of termination (less a
              reasonable sum in respect of the Customer{"'"}s use of the service
              to date of termination), provided the Customer provides all the
              information that may be necessary to assist the Supplier in
              resolving the defect or fault. However if both the replacement and
              repair appear financially unreasonable to the Supplier, the
              Supplier shall terminate this agreement immediately.
            </ParagraphText>
            <ParagraphText>
              3.2 The Supplier does not represent or warrant that the service
              will be error-free or accessible at all times, the delivery of the
              services will be uninterrupted or without delay, defects will be
              corrected. The Customer agrees that the Supplier shall not be
              responsible for unauthorized access to or alteration of the
              Customer{"'"}s data. The Supplier disclaims any and all warranties
              regarding services provided by third parties, regardeless of
              whether those services appear to be provided by the Supplier.
            </ParagraphText>
            <ParagraphText>
              3.3 The Customer represents and warrants to the Supplier that has
              the experience and knowledge necessary to use services and will
              provide the Supplier with material that may be implemented by the
              Supplier to provide services without extra effort on its part.
            </ParagraphText>
            <ParagraphText>
              3.4 The Supplier shall have no liability for any losses or damages
              which may be suffered by the Customer (or any person claiming
              under or through the Customer), whether the same are suffered
              directly or indirectly or are immediate or consequential, and
              whether the same arise in contract, tort (including negligence) or
              otherwise howsoever, which fall within any of the following
              categories: a) special damage even though the Supplier was aware
              of the circumstances in which such special damage could arise; b)
              loss of profits; c) loss of business opportunity; d) loss of
              goodwill; e) loss of data.
            </ParagraphText>
            <ParagraphText>
              3.5 The Customer agrees that, in entering into this agreement,
              either it did not rely on any representations (whether written or
              oral) of any kind or of any person other that those expressly set
              out in this agreement or (if it did rely on any representations,
              whether written or oral, not expressly set out in this agreement)
              that it shall have no remedy in respect of such representations
              and (in either case) the Supplier shall have no liability
              otherwise than pursuant to the express terms of this agreement.
            </ParagraphText>
            <ParagraphText>
              3.6 Notwithstanding anything else in the agreement to the
              contrary, the maximum aggregate liability of the Supplier and any
              of its employees, agents or affiliates, under any theory of law
              (including breach of contract, tort, strict liability and
              infringement) shall be a payment of money not to exceed the amount
              payable by the Customer for 3 months of service.
            </ParagraphText>
            <ParagraphText>
              3.7 No party shall be liable to the other for any delay or
              non-performance of its obligations under this agreement arising
              from any cause beyond its control (force majeure) including,
              without limitation, any of the following: act of God, governmental
              act, significant failure of a portion of the power grid,
              significant failure of the Internet, natural disaster, war, flood,
              explosion, riot, insurrection, epidemic, strikes or other
              organized labor action, terrorist activity, or other events of a
              magnitude or type for which precautions are not generally taken in
              the industry. For the avoidance of doubt, nothing in clause 3.7
              shall excuse the Customer from any payment obligations under this
              agreement.
            </ParagraphText>
            <ParagraphText>
              3.8 All other conditions, warranties or other terms which might
              have effect between the parties or be implied or incorporated into
              this agreement or any collateral contract, whether by statute,
              common law or otherwise, are hereby excluded, including, without
              limitation, the implied conditions, warranties or other terms as
              to satisfactory quality, fitness for purpose or the use of
              reasonable skill and care.
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>4. Termination</ParagraphTitle>
            <ParagraphText>
              4.1 Either party may terminate this agreement at any time on
              written notice to the other if the other: a) is in material or
              persistent breach of any of the terms of this agreement and either
              that breach is incapable of remedy, or the other party fails to
              remedy that breach within 30 days after receiving written notice
              requiring it to remedy that breach; or b) is unable to pay its
              debts (within the meaning of section 123 of the Insolvency Act
              1986), or becomes insolvent, or is subject to an order or a
              resolution for its liquidation, administration, winding-up or
              dissolution (otherwise than for the purposes of a solvent
              amalgamation or reconstruction), or has an administrative or other
              receiver, manager, trustee, liquidator, administrator or similar
              officer appointed over all or any substantial part of its assets,
              or enters into or proposes any composition or arrangement with its
              creditors generally, or is subject to any analogous event or
              proceeding in any applicable jurisdiction.
            </ParagraphText>
            <ParagraphText>
              4.2 Notwithstanding clause 4.1, the Supplier may at any time
              terminate this agreement for any reason by giving written notice
              to the Customer, whereas the Customer may terminate this agreement
              by giving 14 days{"'"} notice in writing to the Supplier if it
              wishes to stop using the service.
            </ParagraphText>
            <ParagraphText>
              4.3 The Customer agrees that the Supplier may suspend services to
              the Customer without notice and without liability if: a) the
              Supplier reasonably believes that the services are being used in
              violation of the this agreement; b) the Supplier reasonably
              believes that the suspension of service is necessary to protect
              its network or its other customers; c) as requested by a law
              enforcement or regulatory agency; or d) the Customer failures to
              pay fees due. The Customer shall pay the Supplier{"'"}s reasonable
              reinstatement fee if service is reinstituted following a
              suspension of service under this subsection.
            </ParagraphText>
            <ParagraphText>
              4.4 On termination for any reason: a) all rights granted to the
              Customer under this agreement shall cease; b) the Customer shall
              cease all activities authorised by this agreement; c) the Customer
              shall immediately pay to the Supplier any sums due to the Supplier
              under this agreement.
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>5. Data Protection</ParagraphTitle>
            <ParagraphText>
              5.1 The Customer acknowledges that the Supplier processes personal
              data, as defined under the relevant data protection laws, of the
              users of the service for the purpose of complying with its
              obligations under this agreement.
            </ParagraphText>
            <ParagraphText>
              5.2 The Customer hereby warrants that it has the consent of the
              users to disclose their personal data to the Supplier for the
              purpose of using the service and that for the same purpose the
              users have agreed that their personal data may be transferred to
              territories outside the EEA.
            </ParagraphText>
            <ParagraphText>
              5.3 The Supplier will take all steps reasonably necessary to
              ensure that personal data is treated securely.
            </ParagraphText>
            <ParagraphText>
              5.4 The Customer agrees that the Supplier may, without notice to
              the Customer, report to the appropriate authorities any conduct by
              the Customer or any of the Customer{"'"}s customers or end users
              that the Supplier believes violates applicable law, and provide
              any information that it has about the Customer or any of its
              customers or end users in response to a formal or informal request
              from a law enforcement or regulatory agency or in response to a
              formal request in a civil action that on its face meets the
              requirements for such a request.
            </ParagraphText>
            <ParagraphText>
              5.5 The Supplier shall not disclose any data to third parties, but
              may process such data in duly anonymised and aggregate form for
              purposes such as internal statistics, commercial sale and
              promotion.
            </ParagraphText>
            <ParagraphText>
              5.6 Each party shall, during the term of this agreement and
              thereafter, keep confidential all, and shall not use for its own
              purposes (unless in accordance with clause 5.5) nor without the
              prior written consent of the other disclose to any third party,
              any information of a confidential nature (including, without
              limitation, trade secrets and information of commercial value)
              which may become known to such party from the other party and
              which relates to the other party, unless such information is
              public knowledge or already known to such party at the time of
              disclosure, or subsequently becomes public knowledge other than by
              breach of this agreement, or subsequently comes lawfully into the
              possession of such party from a third party. The provisions of
              this clause shall remain in full force and effect for 1 year after
              the termination of this agreement for any reason.
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>6. Indemnification</ParagraphTitle>
            <ParagraphText>
              6.1 The Customer agree to indemnify, hold harmless and defend the
              Supplier from and against any and all claims, damages, losses,
              liabilities, suits, actions, demands, proceedings (whether legal
              or administrative), and expenses (including, but not limited to,
              reasonable attorney{"'"}s fees) threatened, asserted, or filed by
              a third party against any of the indemnified parties arising out
              of or relating to the Customer{"'"}s breach of any term or
              condition of this agreement, the Customer{"'"}s use of the
              service, any violation by the Customer of any of the Supplier{"'"}
              s policies, and/or any acts or omissions by the Customer. In such
              a case, the Supplier will provide the Customer with written notice
              of such claim, suit or action. The Customer shall cooperate as
              fully as reasonably required in the defense of any claim. The
              Supplier reserves the right, at its own expense, to assume the
              exclusive defense and control of any matter subject to
              indemnification by the Customer.
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>7. Compliance</ParagraphTitle>
            <ParagraphText>
              7.1 The Customer will not use the service in any way or for any
              purpose that would violate, or would have the effect of violating,
              any applicable laws, rules or regulations or any rights of any
              third parties, including without limitation, any law or right
              regarding any copyright, patent, trademark, trade secret, music,
              image, or other proprietary or property right, false advertising,
              unfair competition, defamation, invasion of privacy or rights of
              celebrity.
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>8. Waiver</ParagraphTitle>
            <ParagraphText>
              8.1 No forbearance or delay by either party in enforcing its
              rights shall prejudice or restrict the rights of that party, and
              no waiver of any such rights or of any breach of any contractual
              terms shall be deemed to be a waiver of any other right or of any
              later breach.
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>9. Severability</ParagraphTitle>
            <ParagraphText>
              9.1 In the event that any of the terms of this agreement become or
              are declared to be illegal or otherwise unenforceable, such
              term(s) shall be null and void and shall be deemed deleted from
              this agreement. All remaining terms of this agreement shall remain
              in full force and effect. Notwithstanding the foregoing, if this
              paragraph becomes applicable and, as a result, the value of this
              agreement is materially impaired for either party, as determined
              by such party in its sole discretion, then the affected party may
              terminate this agreement by written notice to the other.
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>10. No Agency</ParagraphTitle>
            <ParagraphText>
              10.1 This agreement does not create any agency, partnership, joint
              venture, or franchise relationship. Neither party has the right or
              authority to, and shall not, assume or create any obligation of
              any nature whatsoever on behalf of the other party or bind the
              other party in any respect whatsoever.
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>11. Third party rights</ParagraphTitle>
            <ParagraphText>
              11.1 No term of this agreement is intended to confer a benefit on,
              or to be enforceable by, any person who is not a party to this
              agreement.
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>12. Notices</ParagraphTitle>
            <ParagraphText>
              12.1 Any notice required to be given pursuant to this agreement
              shall be in writing, and shall be sent to the other party by
              first-class mail or e-mail.
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle />
            <ParagraphText />
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>13. Entire agreement</ParagraphTitle>
            <ParagraphText>
              13.1 This agreement and the website friendsplus.me, in so far as
              it describes the specification, contain the whole agreement
              between the parties relating to the subject matter hereof and
              supersede all prior agreements, arrangements and understandings
              between the parties relating to that subject matter.
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Paragraph>
        <ParagraphInner start="xs" center="xs">
          <Col xs={12}>
            <ParagraphTitle>14. Governing law and jurisdiction</ParagraphTitle>
            <ParagraphText>
              14.1 This agreement, its subject matter or its formation
              (including non-contractual disputes or claims) shall be governed
              by and construed in accordance with laws of the United Kingdom and
              submitted to the non-exclusive jurisdiction of the United Kingdom
              courts.
            </ParagraphText>
          </Col>
        </ParagraphInner>
      </Paragraph>

      <Footer />
    </main>
  </ThemeProvider>
);
