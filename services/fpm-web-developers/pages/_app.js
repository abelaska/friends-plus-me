import Head from "next/head";
import { ThemeProvider } from "styled-components";
import { theme } from "../components/Theme";

export default function App({ Component, pageProps }) {
	return (
		<ThemeProvider theme={theme}>
			<Head>
				<style
					dangerouslySetInnerHTML={{
						__html:
							'html{width:100%;height:100%}body{font-size:14px;font-family:proxima-nova,"Proxima Nova","Helvetica Neue",Helvetica,Arial,sans-serif;margin:0;padding:0;width:100%;height:auto;min-height:100%}.wf-loading:after{width:100%;height:100%;position:fixed;top:0;left:0}.wf-loading *{opacity:0}',
					}}
				/>
				<meta
					name="viewport"
					// kihlstrom.com/2015/shrink-to-fit-no-fixes-zoom-problem-in-ios-9
					content="width=device-width, initial-scale=1, shrink-to-fit=no"
				/>
				<meta charSet="utf-8" />
				<meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />
				<meta name="HandheldFriendly" content="true" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta httpEquiv="cleartype" content="on" />
				<meta name="twitter:card" content="summary" />
				<meta name="twitter:site" content="@FriendsPlusMe" />
				<meta name="twitter:creator" content="@FriendsPlusMe" />
				<meta property="og:type" content="article" />
				<meta property="og:site_name" content="Friends+Me" />
				<meta
					property="og:image"
					itemProp="image"
					content="https://friendsplus.me/static/screenshots/main.jpg"
				/>
				<meta property="og:url" content="https://friendsplus.me" />
				<meta
					property="og:title"
					itemProp="name"
					content="Friends+Me for Developers - Share to ANYWHERE. Because sharing is caring."
				/>
				<meta
					property="og:description"
					itemProp="description"
					content="Publish at the right time, reach more customers and increase engagement. The right cross-promotion, content management and scheduling solution for you. Ramp Up Sales!"
				/>
				<meta name="robots" content="index,follow" />
				<meta
					name="keywords"
					content="Google, Google+, queue, broadcast, repost, cross-post, cross-promote, promote, connect, Facebook, Twitter, Linkedin, Tumblr, Pinterest, Instagram"
				/>
				<link href="https://plus.google.com/+FriendsPlusMe" rel="publisher" />
				<link
					rel="alternate"
					type="application/rss+xml"
					title="RSS"
					href="https://blog.friendsplus.me/feed"
				/>
				<link
					rel="shortcut icon"
					type="image/x-icon"
					href="/static/favicon.ico"
				/>
				<link
					rel="apple-touch-icon"
					sizes="57x57"
					href="/static/apple-touch-icon-57x57.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="60x60"
					href="/static/apple-touch-icon-60x60.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="72x72"
					href="/static/apple-touch-icon-72x72.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="76x76"
					href="/static/apple-touch-icon-76x76.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="114x114"
					href="/static/apple-touch-icon-114x114.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="120x120"
					href="/static/apple-touch-icon-120x120.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="144x144"
					href="/static/apple-touch-icon-144x144.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="152x152"
					href="/static/apple-touch-icon-152x152.png"
				/>
				<link
					rel="apple-touch-icon"
					sizes="180x180"
					href="/static/apple-touch-icon-180x180.png"
				/>
				<link
					rel="icon"
					type="image/png"
					href="/static/favicon-32x32.png"
					sizes="32x32"
				/>
				<link
					rel="icon"
					type="image/png"
					href="/static/android-chrome-192x192.png"
					sizes="192x192"
				/>
				<link
					rel="icon"
					type="image/png"
					href="/static/favicon-96x96.png"
					sizes="96x96"
				/>
				<link
					rel="icon"
					type="image/png"
					href="/static/favicon-16x16.png"
					sizes="16x16"
				/>
				<link rel="manifest" href="/static/manifest.json" />
				<link
					rel="mask-icon"
					href="/static/safari-pinned-tab.svg"
					color="#d40000"
				/>
				<meta name="apple-mobile-web-app-title" content="Friends+Me" />
				<meta name="application-name" content="Friends+Me" />
				<meta name="msapplication-TileColor" content="#2d89ef" />
				<meta
					name="msapplication-TileImage"
					content="/static/mstile-144x144.png"
				/>
				<meta name="theme-color" content="#ffffff" />
				{process.env.NODE_ENV === "production" && (
					<script
						src="https://cdn.ravenjs.com/3.20.1/raven.min.js"
						crossorigin="anonymous"
					/>
				)}
				{process.env.NODE_ENV === "production" && (
					<script
						dangerouslySetInnerHTML={{
							__html: `Raven.config('https://XXX@sentry.io/XXX').install(${JSON.stringify(
								{
									captureUnhandledRejections: true,
									release: require("../package.json").version,
									environment: process.env.NODE_ENV,
								},
							)});`,
						}}
					/>
				)}
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','https://www.google-analytics.com/analytics${
							process.env.NODE_ENV === "production" ? "" : "_debug"
						}.js','ga');ga('create', 'UA-XXX-17', 'auto');`,
					}}
				/>
				<script src="https://use.typekit.net/pba0mdo.js" />
				<script
					dangerouslySetInnerHTML={{
						__html: "try{Typekit.load({ async: true });}catch(e){}",
					}}
				/>
				{process.env.NODE_ENV === "production" && (
					<script
						dangerouslySetInnerHTML={{
							__html:
								'var _iub=_iub||[];_iub.csConfiguration={cookiePolicyId:367858,siteId:31414,lang:"en",priorConsent:false};',
						}}
					/>
				)}
				{process.env.NODE_ENV === "production" && (
					<script
						type="text/javascript"
						src="//cdn.iubenda.com/cookie_solution/safemode/iubenda_cs.js"
						charset="UTF-8"
						async
					/>
				)}
			</Head>
			<Component {...pageProps} />
		</ThemeProvider>
	);
}
