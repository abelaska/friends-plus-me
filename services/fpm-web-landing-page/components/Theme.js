import { ThemeProvider } from 'styled-components';

export const theme = {
  flexboxgrid: {
    gutterWidth: 0, // rem
    outerMargin: 0 // rem
  }
};

export default () => <ThemeProvider theme={theme} />;
