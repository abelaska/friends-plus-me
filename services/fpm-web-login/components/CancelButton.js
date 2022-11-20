import styled, { ThemeProvider } from 'styled-components';
import { theme } from '../components/Theme';

const CancelButton = styled.button`
  border: 0;
  outline: none;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.02);
  color: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.18);
  font-size: 20px;
  font-weight: bold;
  padding: 0 2.25rem;
  line-height: 3rem;
  border-radius: .3em;
  display: inline-block;
  -webkit-transition: all 0.2s;
  transition: all 0.2s;
  position: relative;
  text-decoration: none;

  &:not([disabled]):hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

export default props =>
  <ThemeProvider theme={theme}>
    <CancelButton {...props}>Cancel</CancelButton>
  </ThemeProvider>;
