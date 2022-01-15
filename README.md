# deno_twitter_oauth

Twitter Oauth 1.0a API Module.\
reference by https://developer.twitter.com/en/docs/authentication/oauth-1-0a

# Usage

## Simple get Auth Link

```ts
import {
  getAuthenticateLink,
  type GetAuthLinkParam,
} from "https://deno.land/x/twitter_oauth_1_0a@0.0.1/mod.ts";
const params: GetAuthLinkParam = {
  oauthConsumerKey: "<Oauth Consumer Key>",
  oauthConsumerSecret: "<Oauth Consumer Secret>",
  oauthCallback: "<CallbackUrl>",
};

const result = await getAuthenticateLink(params);

console.log(result.url);
// => https://api.twitter.com/oauth/authenticate?oauth_token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Use on oak (User Access Tokens (3-legged OAuth flow))

```ts
import { Application, Router } from "https://deno.land/x/oak@v10.1.0/mod.ts";
import { Session } from "https://deno.land/x/oak_sessions/mod.ts";

import {
  getAccessToken,
  getAuthenticateLink,
  type GetAuthLinkParam,
  stringQueryToObject,
} from "https://deno.land/x/twitter_oauth_1_0a@0.0.1/mod.ts";

import {
  statusHomeTimeline,
  statusUpdate,
} from "https://kamekyame.github.io/twitter_api_client/mod.ts";

const session = new Session();

const oauthConsumerKey = "<Oauth Consumer Key>";
const oauthConsumerSecret = "<Oauth Consumer Secret>";
const oauthCallback = "http://host/oauth/callback";

const router = new Router();
router.get("/", (ctx) => {
  ctx.response.body =
    '<!DOCTYPE html><html><body><span>get "/"</span><br/><a href="/login">LOGIN</a></body></html>';
});

router.get("/login", async (ctx) => {
  const authParam: GetAuthLinkParam = {
    oauthConsumerKey,
    oauthConsumerSecret,
    oauthCallback,
  };

  const urlResponse = await getAuthenticateLink(authParam);

  await ctx.state.session.set("oauthTokenSecret", urlResponse.oauthTokenSecret);

  ctx.response.redirect(
    urlResponse.url,
  );
});
router.get("/oauth/callback", async (ctx) => {
  const query = ctx.request.url.toString().split("?")[1];

  const oauthTokenSecret = await ctx.state.session.get("oauthTokenSecret");

  const { oauth_token, oauth_verifier } = stringQueryToObject(query, {
    oauth_token: "",
    oauth_verifier: "",
  });

  const accessToken = await getAccessToken({
    oauthConsumerKey,
    oauthConsumerSecret,
    oauthToken: oauth_token.toString(),
    oauthVerifier: oauth_verifier.toString(),
    oauthTokenSecret,
  });

  const twitterParam = {
    consumerKey: oauthConsumerKey,
    consumerSecret: oauthConsumerSecret,
    token: accessToken.oauth_token,
    tokenSecret: accessToken.oauth_token_secret,
  };

  // HomeTimeLine
  const timeline = await statusHomeTimeline(twitterParam, {
    count: 10,
    trim_user: true,
  });

  // Post if get write permission
  await statusUpdate(dwitterParam, { status: "Post By Deno" });

  ctx.response.body = `Hello, ${accessToken.screen_name} from Twitter`;
});

const app = new Application();

app.use(session.initMiddleware());
app.use(router.allowedMethods());
app.use(router.routes());

await app.listen({ port: 8080 });
```

## Pin-based Oauth

```ts
import {
  getAccessToken,
  type GetAccessTokenParam,
  getPinAuthenticateLink,
  type GetPinAuthLinkParam,
  //} from "https://deno.land/x/twitter_oauth_1_0a@0.0.1/mod.ts";
} from "./deno_twitter_oauth/mod.ts";

import {
  statusHomeTimeline,
} from "https://kamekyame.github.io/twitter_api_client/mod.ts";

const oauthConsumerKey = "<Oauth Consumer Key>";
const oauthConsumerSecret = "<Oauth Consumer Secret>";

const authParam: GetPinAuthLinkParam = {
  oauthConsumerKey,
  oauthConsumerSecret,
};

const {url, oauth_token, oauthTokenSecret} = await getPinAuthenticateLink(authParam);

console.log(`Please open to ${url}`);

const oauthVerifier = prompt("Input Pin code :");

if (typeof oauthVerifier !== "string") {
  Deno.exit();
}

const accessTokenParam: GetAccessTokenParam = {
  oauthConsumerKey,
  oauthConsumerSecret,
  oauthToken: oauth_token,
  oauthVerifier,
  oauthTokenSecret: oauthTokenSecret,
};

const accessToken = await getAccessToken(accessTokenParam);

const twitterParam = {
  consumerKey: oauthConsumerKey,
  consumerSecret: oauthConsumerSecret,
  token: accessToken.oauth_token,
  tokenSecret: accessToken.oauth_token_secret,
};

// HomeTimeLine
const timeline = await statusHomeTimeline(twitterParam, {
  count: 10,
  trim_user: true,
});

console.log(timeline);
```