import styled, { ThemeProvider } from 'styled-components';
import { theme } from '../components/Theme';

export const BetaLabel = styled.span`
  background-color: #54b8df;
  border-radius: 4px;
  padding: 3px 5px;
  font-size: 9px;
  color: #fff;
  font-weight: 300;
`;

export const Beta = () => (
  <ThemeProvider theme={theme}>
    <BetaLabel>Beta</BetaLabel>
  </ThemeProvider>
);
