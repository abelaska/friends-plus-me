import styled, { ThemeProvider } from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import { theme } from '../components/Theme';

export const Section = styled.section`margin-top: 50px;`;

export const SectionInnerComponent = component => styled(component)`
position: relative;
z-index: 100;

max-width: 1300px;
margin-left: auto;
margin-right: auto;
padding-bottom: 20px;
padding-right: 20px;
padding-left: 20px;

h3 {
  margin: 0;
  line-height: 1.2;
  margin-bottom: 1.5rem;
  text-align: left;
  color: #2d3236;
  font-size: 36px;
  font-weight: 600;
}

h4 {
  color: #8598a7;
  font-size: 18px;
  font-weight: 400;
  margin: 0;
  line-height: 1.4;
  margin-bottom: 1.5rem;
  text-align: left;

  b {
    font-weight: 600;
    color: #2d3236;
  }
}
`;

export const SectionInner = SectionInnerComponent(Row);
export const SectionInnerRow = SectionInnerComponent(Row);
export const SectionInnerCol = SectionInnerComponent(Col);
