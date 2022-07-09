import { Application, Context, Router, Session } from "./mod.ts";

import {
  getAccessToken,
  getAuthenticateLink,
  type GetAuthLinkParam,
  stringQueryToObject,
} from "../mod.ts";

const session = new Session();

const oauthConsumerKey = Deno.env.get("TWITTER_API_KEY") || "";
const oauthConsumerSecret = Deno.env.get("TWITTER_API_SECRET") || "";
const oauthCallback = "http://localhost:8080/twitter/callback";

const router = new Router();
router.get("/", (ctx: Context) => {
  ctx.response.body =
    '<!DOCTYPE html><html><body><span>get "/"</span><br/><a href="/login">LOGIN</a></body></html>';
});

router.get("/login", async (ctx: Context) => {
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
router.get("/twitter/callback", async (ctx: Context) => {
  const query = ctx.request.url.toString().split("?")[1];

  const oauthTokenSecret = await ctx.state.session.get("oauthTokenSecret");

  const { oauthToken, oauthVerifier } = stringQueryToObject(query, {
    oauthToken: "",
    oauthVerifier: "",
  });

  const accessToken = await getAccessToken({
    oauthConsumerKey,
    oauthConsumerSecret,
    oauthToken: oauthToken.toString(),
    oauthVerifier: oauthVerifier.toString(),
    oauthTokenSecret,
  });

  if (!accessToken.status) {
    ctx.response.redirect("/");
  }

  ctx.response.body = `Hello, ${accessToken.screenName} from Twitter`;
});

const app = new Application();

app.use(session.initMiddleware());
app.use(router.allowedMethods());
app.use(router.routes());

await app.listen({ port: 8080 });
