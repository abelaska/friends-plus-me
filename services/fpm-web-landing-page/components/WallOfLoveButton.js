import styled, { ThemeProvider } from 'styled-components';
import { theme } from '../components/Theme';
import { LinkOutlineButton } from '../components/Link';

const WallOfLoveButton = styled(LinkOutlineButton)`
  margin-left: 10px;
  color: #54b8df;
  border-width: 1px;
  border-color: #54b8df;
  margin-top: 30px;
  &:hover {
    background-color: #f2fafd;
  }
`;

export default () =>
  <ThemeProvider theme={theme}>
    <WallOfLoveButton href="/wall-of-love">View our wall of love!</WallOfLoveButton>
  </ThemeProvider>;
