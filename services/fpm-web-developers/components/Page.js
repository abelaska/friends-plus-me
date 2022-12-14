import React from "react";
import { Provider } from "mobx-react";
import { createGlobalStyle, ThemeProvider } from "styled-components";
import { ToastContainer } from "react-toastify";
import { theme } from "../components/Theme";
import initStore, { initialState } from "../utils/stores";
import isServer from "../utils/isServer";
import { analyticsPageView } from "../utils/analytics";
import { Router } from "../routes";

// https://github.com/fkhadra/react-toastify/blob/master/dist/ReactToastify.min.css
// .toastify__progress,.toastify{z-index: 1000}
const GlobalStyle = createGlobalStyle`
@keyframes fade-in {
	from   { opacity: 0; }
	to { opacity: 1; }
}
@-webkit-keyframes toastify-bounceInRight{0%,60%,75%,90%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{opacity:0;-webkit-transform:translate3d(3000px,0,0);transform:translate3d(3000px,0,0)}60%{opacity:1;-webkit-transform:translate3d(-25px,0,0);transform:translate3d(-25px,0,0)}75%{-webkit-transform:translate3d(10px,0,0);transform:translate3d(10px,0,0)}90%{-webkit-transform:translate3d(-5px,0,0);transform:translate3d(-5px,0,0)}to{-webkit-transform:none;transform:none}}@keyframes toastify-bounceInRight{0%,60%,75%,90%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{opacity:0;-webkit-transform:translate3d(3000px,0,0);transform:translate3d(3000px,0,0)}60%{opacity:1;-webkit-transform:translate3d(-25px,0,0);transform:translate3d(-25px,0,0)}75%{-webkit-transform:translate3d(10px,0,0);transform:translate3d(10px,0,0)}90%{-webkit-transform:translate3d(-5px,0,0);transform:translate3d(-5px,0,0)}to{-webkit-transform:none;transform:none}}.toast-enter--bottom-right,.toast-enter--top-right,.toastify-bounceInRight{-webkit-animation-name:toastify-bounceInRight;animation-name:toastify-bounceInRight}@-webkit-keyframes toastify-bounceOutRight{20%{opacity:1;-webkit-transform:translate3d(-20px,0,0);transform:translate3d(-20px,0,0)}to{opacity:0;-webkit-transform:translate3d(2000px,0,0);transform:translate3d(2000px,0,0)}}@keyframes toastify-bounceOutRight{20%{opacity:1;-webkit-transform:translate3d(-20px,0,0);transform:translate3d(-20px,0,0)}to{opacity:0;-webkit-transform:translate3d(2000px,0,0);transform:translate3d(2000px,0,0)}}.toast-exit--bottom-right,.toast-exit--top-right,.toastify-bounceOutRight{-webkit-animation-name:toastify-bounceOutRight;animation-name:toastify-bounceOutRight}@-webkit-keyframes toastify-bounceInLeft{0%,60%,75%,90%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{opacity:0;-webkit-transform:translate3d(-3000px,0,0);transform:translate3d(-3000px,0,0)}60%{opacity:1;-webkit-transform:translate3d(25px,0,0);transform:translate3d(25px,0,0)}75%{-webkit-transform:translate3d(-10px,0,0);transform:translate3d(-10px,0,0)}90%{-webkit-transform:translate3d(5px,0,0);transform:translate3d(5px,0,0)}to{-webkit-transform:none;transform:none}}@keyframes toastify-bounceInLeft{0%,60%,75%,90%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{opacity:0;-webkit-transform:translate3d(-3000px,0,0);transform:translate3d(-3000px,0,0)}60%{opacity:1;-webkit-transform:translate3d(25px,0,0);transform:translate3d(25px,0,0)}75%{-webkit-transform:translate3d(-10px,0,0);transform:translate3d(-10px,0,0)}90%{-webkit-transform:translate3d(5px,0,0);transform:translate3d(5px,0,0)}to{-webkit-transform:none;transform:none}}.toast-enter--bottom-left,.toast-enter--top-left,.toastify-bounceInLeft{-webkit-animation-name:toastify-bounceInLeft;animation-name:toastify-bounceInLeft}@-webkit-keyframes toastify-bounceOutLeft{20%{opacity:1;-webkit-transform:translate3d(20px,0,0);transform:translate3d(20px,0,0)}to{opacity:0;-webkit-transform:translate3d(-2000px,0,0);transform:translate3d(-2000px,0,0)}}@keyframes toastify-bounceOutLeft{20%{opacity:1;-webkit-transform:translate3d(20px,0,0);transform:translate3d(20px,0,0)}to{opacity:0;-webkit-transform:translate3d(-2000px,0,0);transform:translate3d(-2000px,0,0)}}.toast-exit--bottom-left,.toast-exit--top-left,.toastify-bounceOutLeft{-webkit-animation-name:toastify-bounceOutLeft;animation-name:toastify-bounceOutLeft}@-webkit-keyframes toastify-bounceInUp{0%,60%,75%,90%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{opacity:0;-webkit-transform:translate3d(0,3000px,0);transform:translate3d(0,3000px,0)}60%{opacity:1;-webkit-transform:translate3d(0,-20px,0);transform:translate3d(0,-20px,0)}75%{-webkit-transform:translate3d(0,10px,0);transform:translate3d(0,10px,0)}90%{-webkit-transform:translate3d(0,-5px,0);transform:translate3d(0,-5px,0)}to{-webkit-transform:translateZ(0);transform:translateZ(0)}}@keyframes toastify-bounceInUp{0%,60%,75%,90%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{opacity:0;-webkit-transform:translate3d(0,3000px,0);transform:translate3d(0,3000px,0)}60%{opacity:1;-webkit-transform:translate3d(0,-20px,0);transform:translate3d(0,-20px,0)}75%{-webkit-transform:translate3d(0,10px,0);transform:translate3d(0,10px,0)}90%{-webkit-transform:translate3d(0,-5px,0);transform:translate3d(0,-5px,0)}to{-webkit-transform:translateZ(0);transform:translateZ(0)}}.toast-enter--bottom-center,.toastify-bounceInUp{-webkit-animation-name:toastify-bounceInUp;animation-name:toastify-bounceInUp}@-webkit-keyframes toastify-bounceOutUp{20%{-webkit-transform:translate3d(0,-10px,0);transform:translate3d(0,-10px,0)}40%,45%{opacity:1;-webkit-transform:translate3d(0,20px,0);transform:translate3d(0,20px,0)}to{opacity:0;-webkit-transform:translate3d(0,-2000px,0);transform:translate3d(0,-2000px,0)}}@keyframes toastify-bounceOutUp{20%{-webkit-transform:translate3d(0,-10px,0);transform:translate3d(0,-10px,0)}40%,45%{opacity:1;-webkit-transform:translate3d(0,20px,0);transform:translate3d(0,20px,0)}to{opacity:0;-webkit-transform:translate3d(0,-2000px,0);transform:translate3d(0,-2000px,0)}}.toast-exit--top-center,.toastify-bounceOutUp{-webkit-animation-name:toastify-bounceOutUp;animation-name:toastify-bounceOutUp}@-webkit-keyframes toastify-bounceInDown{0%,60%,75%,90%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{opacity:0;-webkit-transform:translate3d(0,-3000px,0);transform:translate3d(0,-3000px,0)}60%{opacity:1;-webkit-transform:translate3d(0,25px,0);transform:translate3d(0,25px,0)}75%{-webkit-transform:translate3d(0,-10px,0);transform:translate3d(0,-10px,0)}90%{-webkit-transform:translate3d(0,5px,0);transform:translate3d(0,5px,0)}to{-webkit-transform:none;transform:none}}@keyframes toastify-bounceInDown{0%,60%,75%,90%,to{-webkit-animation-timing-function:cubic-bezier(.215,.61,.355,1);animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{opacity:0;-webkit-transform:translate3d(0,-3000px,0);transform:translate3d(0,-3000px,0)}60%{opacity:1;-webkit-transform:translate3d(0,25px,0);transform:translate3d(0,25px,0)}75%{-webkit-transform:translate3d(0,-10px,0);transform:translate3d(0,-10px,0)}90%{-webkit-transform:translate3d(0,5px,0);transform:translate3d(0,5px,0)}to{-webkit-transform:none;transform:none}}.toast-enter--top-center,.toastify-bounceInDown{-webkit-animation-name:toastify-bounceInDown;animation-name:toastify-bounceInDown}@-webkit-keyframes toastify-bounceOutDown{20%{-webkit-transform:translate3d(0,10px,0);transform:translate3d(0,10px,0)}40%,45%{opacity:1;-webkit-transform:translate3d(0,-20px,0);transform:translate3d(0,-20px,0)}to{opacity:0;-webkit-transform:translate3d(0,2000px,0);transform:translate3d(0,2000px,0)}}@keyframes toastify-bounceOutDown{20%{-webkit-transform:translate3d(0,10px,0);transform:translate3d(0,10px,0)}40%,45%{opacity:1;-webkit-transform:translate3d(0,-20px,0);transform:translate3d(0,-20px,0)}to{opacity:0;-webkit-transform:translate3d(0,2000px,0);transform:translate3d(0,2000px,0)}}.toast-exit--bottom-center,.toastify-bounceOutDown{-webkit-animation-name:toastify-bounceOutDown;animation-name:toastify-bounceOutDown}.toastify-animated{-webkit-animation-duration:.75s;animation-duration:.75s;-webkit-animation-fill-mode:both;animation-fill-mode:both}.toastify{z-index:1000;position:fixed;padding:4px;width:320px;box-sizing:border-box;color:#fff}.toastify--top-left{top:1em;left:1em}.toastify--top-center{top:1em;left:50%;margin-left:-160px}.toastify--top-right{top:1em;right:1em}.toastify--bottom-left{bottom:1em;left:1em}.toastify--bottom-center{bottom:1em;left:50%;margin-left:-160px}.toastify--bottom-right{bottom:1em;right:1em}@media only screen and (max-width:480px){.toastify{width:100vw;padding:0}.toastify--top-center,.toastify--top-left,.toastify--top-right{left:0;top:0;margin:0}.toastify--bottom-center,.toastify--bottom-left,.toastify--bottom-right{left:0;bottom:0;margin:0}}.toastify__close{padding:0;color:#fff;font-weight:700;font-size:14px;background:transparent;outline:none;border:none;cursor:pointer;opacity:.7;transition:.3s ease;-ms-flex-item-align:start;align-self:flex-start}.toastify__close:focus,.toastify__close:hover{opacity:1}.toastify-content--default .toastify__close{color:#000;opacity:.3}.toastify-content--default .toastify__close:hover{opacity:1}.toastify-content{position:relative;min-height:48px;margin-bottom:1rem;padding:8px;border-radius:1px;box-shadow:0 1px 10px 0 rgba(0,0,0,.1),0 2px 15px 0 rgba(0,0,0,.05);display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;max-height:800px;overflow:hidden;font-family:sans-serif;cursor:pointer}.toastify-content--default{background:#fff;color:#aaa}.toastify-content--info{background:#3498db}.toastify-content--success{background:#07bc0c}.toastify-content--warning{background:#f1c40f}.toastify-content--error{background:#e74c3c}.toastify__body{margin:auto 0}@media only screen and (max-width:480px){.toastify-content{margin-bottom:0}}@-webkit-keyframes track-progress{0%{width:100%}to{width:0}}@keyframes track-progress{0%{width:100%}to{width:0}}.toastify__progress{position:absolute;bottom:0;left:0;width:0;height:5px;z-index:1000;opacity:.7;-webkit-animation:track-progress linear 1;animation:track-progress linear 1;background-color:hsla(0,0%,100%,.7)}.toastify__progress--default{background:linear-gradient(90deg,#4cd964,#5ac8fa,#007aff,#34aadc,#5856d6,#ff2d55)}
`;

export default (Page, isProtected) =>
  class PageComponent extends React.Component {
    static async getInitialProps(ctx) {
      let state;
      const isServer = !!ctx.req;
      if (isServer) {
        state = await initialState(ctx);
      }
      if (isServer && isProtected && !state.auth.token) {
        return ctx.res.redirect(302, "/");
      }
      if (isServer && Page.getInitialProps) {
        const pageProps = await Page.getInitialProps({ ...ctx, state });
        state = (pageProps && pageProps.state) || state;
      }
      return { state };
    }

    constructor(props) {
      super(props);
      const { state = {} } = props;
      this.store = initStore(isServer, state);

      if (!isServer) {
        analyticsPageView();
        this.store.auth.startRefreshToken();
        history.pushState("", document.title, window.location.pathname);
      }

      if (isProtected && (!this.store.auth || !this.store.auth.token)) {
        Router.pushRoute("index");
      }
    }

    render() {
      return (
        <Provider store={this.store}>
          <ThemeProvider theme={theme}>
            {!isProtected || (isProtected && this.store.auth.token) ? (
              <main>
                <Page />
                <ToastContainer
                  position="bottom-left"
                  type="default"
                  autoClose={5000}
                  hideProgressBar={false}
                  newestOnTop={false}
                  closeOnClick
                  pauseOnHover
                />
              </main>
            ) : null}
            <GlobalStyle />
          </ThemeProvider>
        </Provider>
      );
    }
  };
