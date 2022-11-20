import styled, { ThemeProvider } from 'styled-components';
import { theme } from '../components/Theme';

const AuthorizeButton = styled.button`
  border: 0;
  outline: none;
  cursor: pointer;
  background-color: rgb(42, 178, 123);
  color: #fff;
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
    -webkit-box-shadow: 0 0 0 6px rgba(42, 178, 123, 0.6), 0 0 0 12px rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 0 6px rgba(42, 178, 123, 0.6), 0 0 0 12px rgba(255, 255, 255, 0.1);
  }
`;

export default props =>
  <ThemeProvider theme={theme}>
    <AuthorizeButton {...props}>Authorize</AuthorizeButton>
  </ThemeProvider>;
