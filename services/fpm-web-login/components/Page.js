import React from "react";
import { Provider } from "mobx-react";
import { createGlobalStyle, ThemeProvider } from "styled-components";
import { theme } from "../components/Theme";
import initStore, { initialState } from "../utils/stores";

const GlobalStyle = createGlobalStyle`
@keyframes fade-in {
	from   { opacity: 0; }
	to { opacity: 1; }
}
`;

export default (Page) =>
  class PageComponent extends React.Component {
    static async getInitialProps({ req }) {
      let state;
      const isServer = !!req;
      if (isServer) {
        state = await initialState({ req });
      }
      return { isServer, state };
    }

    constructor(props) {
      super(props);
      this.store = initStore(this.props.state);
    }

    render() {
      return (
        <Provider store={this.store}>
          <ThemeProvider theme={theme}>
            <Page />
            <GlobalStyle />
          </ThemeProvider>
        </Provider>
      );
    }
  };
