import styled, { ThemeProvider } from 'styled-components';
import { theme } from '../components/Theme';
import { LinkOutlineButton } from '../components/Link';

export default () =>
  <ThemeProvider theme={theme}>
    <LinkOutlineButton href="https://app.friendsplus.me/signup">Start My Free Trial</LinkOutlineButton>
  </ThemeProvider>;
