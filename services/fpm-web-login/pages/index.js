import React, { Component } from "react";
import Head from "next/head";
import { inject, observer } from "mobx-react";
import styled, { createGlobalStyle } from "styled-components";
import Page from "../components/Page";
import Consent from "../components/Consent";
import Login from "../components/Login";
import { showLock } from "../utils/lock";

// eslint-disable-next-line
const IndexGlobalStyle = createGlobalStyle`
  html, body, body > div:first-child, #__next, #__next > div:first-child, #__next > main { height: 100%; margin: 0; }
  .auth0-lock-social-button[data-provider^=google] .auth0-lock-social-button-icon {
    background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjQwcHgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj4gICAgICAgIDx0aXRsZT5nb29nbGUtbG9nbzwvdGl0bGU+ICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPiAgICA8ZGVmcz48L2RlZnM+ICAgIDxnIGlkPSJQYWdlLTEiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPiAgICAgICAgPGcgaWQ9ImJ0bl9nb29nbGVfZGFya19ub3JtYWxfaW9zIj4gICAgICAgICAgICA8ZyBpZD0ibG9nb19nb29nbGVnXzQ4ZHAiPiAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMzkuMiwyMC40NTQ1NDU0IEMzOS4yLDE5LjAzNjM2MzYgMzkuMDcyNzI3MywxNy42NzI3MjczIDM4LjgzNjM2MzYsMTYuMzYzNjM2NCBMMjAsMTYuMzYzNjM2NCBMMjAsMjQuMSBMMzAuNzYzNjM2NCwyNC4xIEMzMC4zLDI2LjYgMjguODkwOTA5MSwyOC43MTgxODE4IDI2Ljc3MjcyNzMsMzAuMTM2MzYzNiBMMjYuNzcyNzI3MywzNS4xNTQ1NDU2IEwzMy4yMzYzNjM2LDM1LjE1NDU0NTYgQzM3LjAxODE4MTgsMzEuNjcyNzI3MyAzOS4yLDI2LjU0NTQ1NDQgMzkuMiwyMC40NTQ1NDU0IFoiIGlkPSJTaGFwZSIgZmlsbD0iIzQyODVGNCIgZmlsbC1ydWxlPSJub256ZXJvIj48L3BhdGg+ICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0yMCw0MCBDMjUuNCw0MCAyOS45MjcyNzI3LDM4LjIwOTA5MDkgMzMuMjM2MzYzNiwzNS4xNTQ1NDU2IEwyNi43NzI3MjczLDMwLjEzNjM2MzYgQzI0Ljk4MTgxODIsMzEuMzM2MzYzNiAyMi42OTA5MDkxLDMyLjA0NTQ1NDQgMjAsMzIuMDQ1NDU0NCBDMTQuNzkwOTA5MSwzMi4wNDU0NTQ0IDEwLjM4MTgxODIsMjguNTI3MjcyNyA4LjgwOTA5MDkxLDIzLjggTDIuMTI3MjcyNzMsMjMuOCBMMi4xMjcyNzI3MywyOC45ODE4MTgyIEM1LjQxODE4MTgyLDM1LjUxODE4MTggMTIuMTgxODE4Miw0MCAyMCw0MCBaIiBpZD0iU2hhcGUiIGZpbGw9IiMzNEE4NTMiIGZpbGwtcnVsZT0ibm9uemVybyI+PC9wYXRoPiAgICAgICAgICAgICAgICA8cGF0aCBkPSJNOC44MDkwOTA5MSwyMy44IEM4LjQwOTA5MDkxLDIyLjYgOC4xODE4MTgxOCwyMS4zMTgxODE4IDguMTgxODE4MTgsMjAgQzguMTgxODE4MTgsMTguNjgxODE4MiA4LjQwOTA5MDkxLDE3LjQgOC44MDkwOTA5MSwxNi4yIEw4LjgwOTA5MDkxLDExLjAxODE4MTggTDIuMTI3MjcyNzMsMTEuMDE4MTgxOCBDMC43NzI3MjcyNzMsMTMuNzE4MTgxOCAwLDE2Ljc3MjcyNzMgMCwyMCBDMCwyMy4yMjcyNzI3IDAuNzcyNzI3MjczLDI2LjI4MTgxODIgMi4xMjcyNzI3MywyOC45ODE4MTgyIEw4LjgwOTA5MDkxLDIzLjggWiIgaWQ9IlNoYXBlIiBmaWxsPSIjRkJCQzA1IiBmaWxsLXJ1bGU9Im5vbnplcm8iPjwvcGF0aD4gICAgICAgICAgICAgICAgPHBhdGggZD0iTTIwLDcuOTU0NTQ1NDQgQzIyLjkzNjM2MzYsNy45NTQ1NDU0NCAyNS41NzI3MjczLDguOTYzNjM2MzYgMjcuNjQ1NDU0NCwxMC45NDU0NTQ2IEwzMy4zODE4MTgyLDUuMjA5MDkwOTEgQzI5LjkxODE4MTgsMS45ODE4MTgxOCAyNS4zOTA5MDkxLDAgMjAsMCBDMTIuMTgxODE4MiwwIDUuNDE4MTgxODIsNC40ODE4MTgxOCAyLjEyNzI3MjczLDExLjAxODE4MTggTDguODA5MDkwOTEsMTYuMiBDMTAuMzgxODE4MiwxMS40NzI3MjczIDE0Ljc5MDkwOTEsNy45NTQ1NDU0NCAyMCw3Ljk1NDU0NTQ0IFoiIGlkPSJTaGFwZSIgZmlsbD0iI0VBNDMzNSIgZmlsbC1ydWxlPSJub256ZXJvIj48L3BhdGg+ICAgICAgICAgICAgICAgIDxwb2x5Z29uIGlkPSJTaGFwZSIgcG9pbnRzPSIwIDAgNDAgMCA0MCA0MCAwIDQwIj48L3BvbHlnb24+ICAgICAgICAgICAgPC9nPiAgICAgICAgPC9nPiAgICA8L2c+PC9zdmc+) !important;
    width: 36px !important;
    height: 36px !important;
    background-color: #fff !important;
    border: 2px solid #4285F4;
  }
  .auth0-lock.auth0-lock .auth0-lock-social-button.auth0-lock-social-big-button .auth0-lock-social-button-text {
    text-transform: capitalize !important;
    font-size: 12px !important;
  }
`;

@inject("store")
@observer
class Index extends Component {
  componentDidMount() {
    showLock({ store: this.props.store, skipConsentingStop: true });
  }

  render() {
    const {
      store: {
        ui: { sign, consent },
      },
    } = this.props;
    const title =
      sign === "up"
        ? "Friends+Me Sign Up"
        : `${consent ? consent.app.name : "Friends+Me"} Authentication`;
    return (
      <main>
        <Head>
          <title>{title}</title>
        </Head>
        {(consent && <Consent />) || <Login />}
        <IndexGlobalStyle />
      </main>
    );
  }
}

export default Page(Index);
