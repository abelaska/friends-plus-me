import styled, { ThemeProvider } from 'styled-components';
import randomColor from 'randomcolor';
import { theme } from '../components/Theme';

export const ImageWrap = styled.figure`
  margin: 0 auto;
  overflow: hidden;
  position: relative;
  border-radius: 0.3em;
`;

export const ResponsiveImage = styled.img`
  display: block;
  height: auto;
  max-width: 50px;
  max-height: 50px;
`;

export const ResponsiveText = styled.div`
  display: block;
  width: 50px;
  height: 50px;
  line-height: 50px;
  font-weight: 500;
  color: #fff;
`;

export default ({ src, name = '', ...props }) => (
  <ThemeProvider theme={theme}>
    <ImageWrap>
      {(src && <ResponsiveImage src={src} {...props} />) || (
        <ResponsiveText style={{ backgroundColor: randomColor({ luminosity: 'dark', seed: name }) }}>
          {name
            .split(/[ \t]+/)
            .slice(0, 2)
            .map(w => w.substr(0, 1).toUpperCase())
            .join('')}
        </ResponsiveText>
      )}
    </ImageWrap>
  </ThemeProvider>
);
