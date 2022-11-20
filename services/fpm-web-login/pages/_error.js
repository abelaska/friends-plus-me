import NextError from 'next/error';
import IsomorphicRaven from '../utils/raven';

class MyError extends NextError {
  static getInitialProps = async context => {
    if (context.err && IsomorphicRaven) {
      IsomorphicRaven.captureException(context.err);
    }
    const errorInitialProps = await NextError.getInitialProps(context);
    return errorInitialProps;
  };
}

export default MyError;
