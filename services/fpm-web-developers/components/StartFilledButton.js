import styled, { ThemeProvider } from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import { theme } from '../components/Theme';
import { LinkOutlineButton } from '../components/Link';

export const StartFilledButton = styled(LinkOutlineButton)`
  font-size: 20px;
  padding: 15px 30px;
  margin: 0px 0 50px 0;
  font-weight: 600;
  border-radius: 8px;
  background: -webkit-linear-gradient(-410deg, #0f3966 10%, #0f3966 90%);
  background: linear-gradient(140deg, #0f3966 10%, #0f3966 90%);
  &:hover {
    opacity: 0.9;
  }
`;

export default () =>
  <ThemeProvider theme={theme}>
    <StartFilledButton href="https://app.friendsplus.me/signup">Start Scheduling Content</StartFilledButton>
  </ThemeProvider>;
