import styled, { ThemeProvider } from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import { theme } from '../components/Theme';

const Logo = styled.img`
  width: 38px;
  height: 38px;
`;

const LogoName = styled.div`
  font-size: 19px;
  color: #fff;
  margin-left: 10px;
  font-weight: 300;

  b {
    font-weight: 500;
  }
`;

export default () =>
  <ThemeProvider theme={theme}>
    <Row start="xs" middle="xs">
      <Logo src="/static/android-chrome-48x48.png" />
      <LogoName>
        Friends+Me <b>API</b>
      </LogoName>
    </Row>
  </ThemeProvider>;
