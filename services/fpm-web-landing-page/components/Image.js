import styled, { ThemeProvider } from 'styled-components';
import { theme } from '../components/Theme';

export const ImageWrap = styled.figure`
  box-shadow: 0 25px 60px rgba(0, 0, 0, .55);
  background: #e6e8eb;
  margin: 0 auto;
  overflow: hidden;
  position: relative;
  border-radius: .3em;
`;

export const ResponsiveImage = styled.img`
  display: block;
  height: auto;
  max-width: 100%;
`;

export default props =>
  <ThemeProvider theme={theme}>
    <ImageWrap>
      <ResponsiveImage {...props} />
    </ImageWrap>
  </ThemeProvider>;
