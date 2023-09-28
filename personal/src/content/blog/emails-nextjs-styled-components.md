---
title: "Let's try email rendering in Next.js"
description: "Next.js, styled-components and SSR to email templating and sending newsletters"
pubDate: "April 13 2023"
keywords: "nextjs, react, styled-components, email, SSR, html, nodemailer"
heroImage: "/nextjs.jpg"
---

Sometimes we need to send personalized emails and have some prettiness as requirements.
Almost in every case we use some kind of templating to streamline the process of generating an html to send as email,
so there is some naive approach using Next.js for lazy people as me.

### Generating the email html
What if we can have a web page that can be use as the needed html in email? That will be awesome because:
- We could be using almost all of our existing components or complex data fetching logic (only server side).
- We will have a first hand way to render the exact email in browser.
- We easily can use some "templating" by query params usage.

All seams good, so let's try it. First of all, the desired page should not use any javascript, should be as static as posible,
that means that we will be using full SSR and avoid any kind of logic to make page dynamic.

Secondly, email client have not full support for css in general, so there is a lot of workarounds to be made,
and maybe some components needs to be created having this in mind, here are some of the most common pitfalls:
- Using `display: flex`
- Too large `<style>` tags
- External fonts
- Using `svg`
- Using `next/image`
- box shadows in css
- `background-position-x` or `background-position-y` with values like `-10px`.
- using `cursor` or `pointer-events`

This [article](https://engineeringblog.yelp.com/2022/07/writing-emails-using-react.html) covers a more in depth analysis.
And also, another big issue will be outlook (and maybe some other clients, that have support almost entirely to inline styles), so, beware of that 😭.

Could be a good feature a tool to transform all page styles to inline and have full support and a bullet proof pipeline to generate the emails, maybe that comes next.

As already said, for templating and generating the final html to send in email body we will use native SSR of Next.js, using a classic page with a `getServerSideProps` defined
``` typescript
// Email-rendering page /email
import {GetServerSideProps} from 'next';
import Newsletter from 'modules/newsletter/application/Newsletter';
import NewsletterPageProps from 'modules/newsletter/domain/types';

export default function NewsletterPage({
  message,
  name,
}: NewsletterPageProps) {
  return (
    <Newsletter
      message={message}
      name={name}
    />
  );
}

export const getServerSideProps: GetServerSideProps = async ({query}) => {
  const message = query?.headerTitle as string;

  return {
    props: {
      message: message || null,
      name: name || null,
    },
  };
};

```
But this alone does not always generates a fully visible html page on request, at least in development mode, Next.js is somewhat complex,
and in some cases the hydration process and/or hot-reload could make the initial rendered page to not be fully static in development,
this happens for example if using a `Head` inside `_document.tsx`.
So the trick here is to not include the `Head` element in dev (do not ask me why 🤣, just inner workings of Next.js).

⚠️ Note also that this code have been setup to play nice with styled-components.⚠️

``` typescript
// _document.tsx
import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
  DocumentInitialProps,
} from 'next/document';
import {ServerStyleSheet} from 'styled-components';

export const htmlOnlyPages = ['/newsletter'];

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    try {
      // Run the React rendering logic synchronously
      ctx.renderPage = () =>
        originalRenderPage({
          // Useful for wrapping the whole react tree
          enhanceApp: App => props => sheet.collectStyles(<App {...props} />),
          enhanceComponent: Component => Component,
        });

      // Run the parent `getInitialProps`, it now includes the custom `renderPage`
      const initialProps = await Document.getInitialProps(ctx);

      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            {sheet.getStyleElement()}
          </>
        ),
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    const {__NEXT_DATA__} = this.props;
    const IS_PRODUCTION = process.env.NODE_ENV === 'production';
    const renderOnlyHtml = !IS_PRODUCTION && htmlOnlyPages.includes(__NEXT_DATA__.page);
    return (
      <Html>
        {renderOnlyHtml && (
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            {this.props.styles}
          </head>
        )}

        {!renderOnlyHtml (
          <Head>
            <link
              rel="stylesheet"
              href="https://fonts.googleapis.com/css?family=Roboto+Flex:300,400,500,700,800&display=swap"
            />
          </Head>
        )}

        <body>
          <Main />
          {!renderOnlyHtml <NextScript />}
        </body>
      </Html>
    );
  }
}

export default MyDocument;
```


⚠️ Keep in mind any of this implementations are not magic, we still are walking on thin ice here, and for a correct visualization of the page, it should comply with some email standards.⚠️

### Sending email
Having all ready to send the emails, we setup an api endpoint, in which we will make a get request to the previously created page and then send the email (using `nodemailer` and gmail):

``` typescript
import nodemailer from 'nodemailer';
import {NextApiRequest, NextApiResponse} from 'next';
import axios from 'axios';
import {getEmailRecipients} from 'dataFetchers';

type RequestBody = {
  message: string;
};

export default async function sendEmail(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method Not Allowed'});
  }

  // Calculate expected hash token
  const API_TOKEN = process.env.API_TOKEN;
  // Check api AuthToken in headers
  const {appauthtoken} = req.headers;
  if (!appauthtoken || appauthtoken !== API_TOKEN) {
    return res.status(401).json({error: 'Unauthorized'});
  }

  const {message}: RequestBody = req.body;

  const emailRecipients = await getEmailRecipients();

  // Verify we have recipients to send the email to
  if (!emailRecipients.length) return res.status(406).json({error: 'No email recipients found'});

  try {
    let renderedEmail = '';

    // Get the current domain
    // This is a nasty but required workaround
    const nextRequestMeta =
      // @ts-ignore
      req[Reflect.ownKeys(req).find(s => String(s) === 'Symbol(NextRequestMeta)')];
    // eslint-disable-next-line no-underscore-dangle
    const currentProtocol = nextRequestMeta._protocol;
    const currentDomain = `${currentProtocol}://${req.headers.host}`;

    await axios
      .get(`${currentDomain}/email`, {
        params: {
          name: "VAR_USER_NAME",
          message: message,
        },
      })
      .then(result => {
        renderedEmail = result.data;
      })
      .catch(err => res.status(500).json({error: 'Failed retrieving the email template', err}));

    // Create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      port: Number(process.env.EMAIL_SERVICE_PORT),
      secure: process.env.EMAIL_SERVICE_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_SERVICE_USER,
        pass: process.env.EMAIL_SERVICE_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Define the email requests
    const emailRequests = emailRecipients.map(recipient => {
      // Inject the name and email of the recipient in the email template
      const emailReplaced = renderedEmail
        .replaceAll('VAR_USER_NAME', recipient.name);

      // Define transporter mail sender
      return transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to: recipient.email,
        subject: newsletter.title,
        html: emailReplaced,
      });
    });

    // Sending all mails with the defined transport object
    const result = await Promise.allSettled(emailRequests).then(promisesResults => {
      const resultData: any[] = [];
      promisesResults.forEach(promiseResult => {
        resultData.push(promiseResult.value || 'rejected');
      });
      return resultData;
    });

    return res.status(200).json({message: 'Emails sent successfully', details: result});
  } catch (err) {
    return res.status(500).json({error: 'Internal Server Error', err});
  }

  return res.status(200).json({message: 'Emails sent successfully'});
}

```

Note that:
- We protect the endpoint via auth token.
- We use some kind of re-templating, useful to send same template to multiple recipients (changing only name or example, like a welcome email)
  and avoid re rendering next.js page.
- ⚠️ A better approach maybe includes some microservice to manage the sending emails in bulks, with a queue/pool and some support for retry on failures for example, this is just an example and does not scales well.
- ⚠️ An even better approach could be cutting the middle man and rendering the react page programatically and not via a web request, it should work with a slight modification of the code, but I have not tested it.
- In the example code we are using a workaround to get the current domain where is hosted the app.
- In the email we can easily have a link redirecting to web page to render email correctly and easily, like a "could not view in correctly?, view in browser"


And that should do it folks, happy coding and Godspeed.😁
