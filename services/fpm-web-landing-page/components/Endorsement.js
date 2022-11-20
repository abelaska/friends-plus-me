import styled, { ThemeProvider } from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import { theme } from '../components/Theme';

const Endorsement = styled(Row)`
  padding: 18px;
  border-top: 1px solid #eef6fc;
  border-radius: 4px;
  background-color: white;
  -webkit-box-shadow: rgba(66, 113, 151, 0.09) 0px 1px 1px 1px;
  box-shadow: rgba(66, 113, 151, 0.09) 0px 1px 1px 1px;
  color: #50565a;
  font-size: 16px;
  line-height: 22px;
`;

const EndorsementContent = styled(Col)`
  padding-left: 5%;
`;

const EndorsementQuote = styled.div`
  color: #50565a;
  font-size: 16px;
  line-height: 22px;

  b {
    background-color: #e6f3fc;
    font-weight: 600;
  }
`;

const EndorsementAuthorName = styled.div`
  margin-top: 10px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
`;

const EndorsementAuthorTitle = styled.div`
  font-size: 11px;
  line-height: 11px;
  font-weight: 100;
  color: rgba(0, 0, 0, 0.5);
`;

const EndorsementAuthorPhoto = styled(Col)`
  width: 17%;
  img {
    max-width: 100%;
    border-radius: 50%;
  }
`;

export default ({ customer, short }) => (
  <ThemeProvider theme={theme}>
    <Endorsement start="xs" left="xs">
      <EndorsementAuthorPhoto xs={2}>
        <img src={customer.photo} />
      </EndorsementAuthorPhoto>
      <EndorsementContent xs={10}>
        <EndorsementQuote
          dangerouslySetInnerHTML={{
            __html: (short ? customer.quoteShort : null) || customer.quote
          }}
        />
        <EndorsementAuthorName>{customer.name}</EndorsementAuthorName>
        <EndorsementAuthorTitle>{customer.title}</EndorsementAuthorTitle>
      </EndorsementContent>
    </Endorsement>
  </ThemeProvider>
);
