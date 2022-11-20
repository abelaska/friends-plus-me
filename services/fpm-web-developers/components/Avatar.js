import styled from 'styled-components';

export const ImageWrap = styled.figure`
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
  <ImageWrap>
    <ResponsiveImage {...props} />
  </ImageWrap>;
