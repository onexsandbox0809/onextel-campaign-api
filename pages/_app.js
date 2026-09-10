import '../styles/globals.css';
import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Onextel Dashboard</title>

        <meta
          name="description"
          content="Onextel Campaign Dashboard"
        />

        <link
          rel="icon"
          href="/favicon.png"
        />
      </Head>

      <Component {...pageProps} />
    </>
  );
}
