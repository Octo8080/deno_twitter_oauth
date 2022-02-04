import { hmac, snakeCase } from "../deps.ts";
import {
  type ObjectOfStringKey,
  type ObjectOfStringKeyAnyValue,
  selectObject,
  stringQueryToObject,
  stringValuesObjectToMultiValuesObject,
} from "./util.ts";

const requestTokenUrl = "https://api.twitter.com/oauth/request_token";

export interface GetPinAuthLinkParam extends ObjectOfStringKey {
  oauthConsumerKey: string;
  oauthConsumerSecret: string;
}

export interface GetRequestTokenParam extends GetPinAuthLinkParam {
  oauthCallback: string;
}

export type GetAuthLinkParam = GetRequestTokenParam;

export interface BuildSignatureForRequestTokenParam extends ObjectOfStringKey {
  oauthCallback: string;
  oauthConsumerKey: string;
  oauthConsumerSecret: string;
  oauthTimestamp: string;
  oauthNonce: string;
  oauthVersion: string;
  method: string;
  oauthSignatureMethod: string;
}

export interface BuildSignatureForAccessTokenParam extends ObjectOfStringKey {
  oauthConsumerKey: string;
  oauthConsumerSecret: string;
  oauthTimestamp: string;
  oauthNonce: string;
  oauthVersion: string;
  method: string;
  oauthSignatureMethod: string;
  oauthToken: string;
  oauthVerifier: string;
}

export type BuildSignatureParam =
  | BuildSignatureForRequestTokenParam
  | BuildSignatureForAccessTokenParam;

export interface BuildSignatureKeyParam {
  oauthConsumerSecret: string;
  oauthTokenSecret?: string;
}

export interface BuildSignatureBaseParam {
  method: string;
  oauthCallback?: string;
  oauthConsumerKey: string;
  oauthTimestamp: string;
  oauthNonce: string;
  oauthVersion: string;
  oauthSignatureMethod: string;
  oauthToken?: string;
}

export interface BuildSignatureEncordedBaseParams {
  oauthCallback: string;
  oauthConsumerKey: string;
  oauthTimestamp: string;
  oauthNonce: string;
  oauthVersion: string;
  oauthSignatureMethod: string;
}

export interface GetAccessTokenParam extends ObjectOfStringKey {
  oauthConsumerKey: string;
  oauthConsumerSecret: string;
  oauthToken: string;
  oauthVerifier: string;
  oauthTokenSecret: string;
}

export function buildSignatureKey(params: BuildSignatureKeyParam): string {
  const oauthTokenSecret = params.oauthTokenSecret === undefined
    ? ""
    : params.oauthTokenSecret;
  return `${params.oauthConsumerSecret}&${oauthTokenSecret}`;
}

export function buildSignatureBase(params: BuildSignatureBaseParam): string {
  let encodedParams = <BuildSignatureEncordedBaseParams> (
    selectObject(params, [
      "oauthCallback",
      "oauthConsumerKey",
      "oauthTimestamp",
      "oauthNonce",
      "oauthVersion",
      "oauthSignatureMethod",
    ])
  );

  (Object.keys(encodedParams) as (keyof typeof encodedParams)[]).forEach(
    (key) => {
      encodedParams[key] = encodeURIComponent(encodedParams[key]);
    },
  );

  const encordedJoindString = (
    Object.keys(encodedParams) as (keyof typeof encodedParams)[]
  )
    .sort()
    .map((key) => `${snakeCase(key)}=${encodedParams[key]}`)
    .join("&");

  const reEncordedJoindString = encodeURIComponent(encordedJoindString);

  const keyBase = `${params.method.toUpperCase()}&${
    encodeURIComponent(
      requestTokenUrl,
    )
  }&${reEncordedJoindString}`;

  return keyBase;
}

export function buildSignature(params: BuildSignatureParam): string {
  const keyParams = <BuildSignatureKeyParam> (
    selectObject(params, ["oauthConsumerSecret"])
  );
  const signatureKey = buildSignatureKey(keyParams);

  const baseParams = <BuildSignatureBaseParam> (
    selectObject(params, [
      "oauthCallback",
      "oauthConsumerKey",
      "oauthTimestamp",
      "oauthNonce",
      "oauthVersion",
      "oauthSignatureMethod",
      "method",
    ])
  );
  const signatureBase = buildSignatureBase(baseParams);

  const signature = hmac(
    "sha1",
    signatureKey,
    signatureBase,
    "utf8",
    "base64",
  ).toString();

  return encodeURIComponent(signature);
}

interface BuildHeadersParam extends ObjectOfStringKey {
  oauthSignature: string;
}

export function buildHeaders(params: BuildHeadersParam): Headers {
  const targetObject = selectObject(params, [
    "oauthConsumerKey",
    "oauthTimestamp",
    "oauthNonce",
    "oauthVersion",
    "oauthSignatureMethod",
    "oauthSignature",
    "oauthToken",
    "oauthVerifier",
  ]);

  const joindParams = (
    Object.keys(targetObject) as (keyof typeof targetObject)[]
  )
    .sort()
    .map((key) => `${snakeCase(key)}="${params[key]}"`)
    .join(", ");

  const headers = new Headers({
    Authorization: `OAuth ${joindParams}`,
  });
  return headers;
}

export async function getRequestToken(
  params: GetRequestTokenParam,
): Promise<ObjectOfStringKeyAnyValue> {
  const oauthTimestamp: string = getTimestamp();
  const oauthNonce: string = getNonce();

  const buildSignatureParam = Object.assign(
    {
      method: "Post",
      oauthTimestamp,
      oauthNonce,
      oauthVersion: "1.0",
      oauthSignatureMethod: "HMAC-SHA1",
    },
    params,
  );

  const oauthSignature = buildSignature(buildSignatureParam);

  const buildHeadersParam: BuildHeadersParam = Object.assign(
    buildSignatureParam,
    { oauthSignature },
  );

  const headers = buildHeaders(buildHeadersParam);

  const response = await fetch(
    `https://api.twitter.com/oauth/request_token?oauth_callback=${
      encodeURIComponent(
        params.oauthCallback,
      )
    }`,
    {
      method: "POST",
      headers,
    },
  );

  const defaultResponse = {
    status: "false",
    oauthToken: "",
    oauthTokenSecret: "",
    oauthCallbackConfirmed: "false",
  };

  if (response.status !== 200) {
    return defaultResponse;
  }

  const responseText = await response.text();

  const result = stringQueryToObject(
    responseText,
    Object.assign(defaultResponse, { status: true }),
  );

  return stringValuesObjectToMultiValuesObject(result);
}

function getNonce(): string {
  return crypto.randomUUID();
}

function getTimestamp(): string {
  return (new Date()).getTime().toString().substring(
    0,
    10,
  );
}

export async function getAccessToken(
  params: GetAccessTokenParam,
): Promise<ObjectOfStringKeyAnyValue> {
  const oauthTimestamp: string = getTimestamp();
  const oauthNonce: string = getNonce();

  const buildSignatureParam: BuildSignatureParam = Object.assign(
    {
      method: "Post",
      oauthTimestamp,
      oauthNonce,
      oauthVersion: "1.0",
      oauthSignatureMethod: "HMAC-SHA1",
    },
    params,
  );

  const oauthSignature = buildSignature(buildSignatureParam);

  const buildHeadersParam: BuildHeadersParam = Object.assign(
    buildSignatureParam,
    { oauthSignature },
  );

  const headers = buildHeaders(buildHeadersParam);

  const response = await fetch(
    "https://api.twitter.com/oauth/access_token",
    {
      method: "POST",
      headers,
    },
  );

  const defaultResponse = {
    status: "false",
    oauthToken: "",
    oauthTokenSecret: "",
    userId: "",
    screenName: "",
  };

  if (response.status !== 200) {
    return defaultResponse;
  }

  const responseText = await response.text();

  const result = stringQueryToObject(
    responseText,
    Object.assign(defaultResponse, { status: "true" }),
  );

  return stringValuesObjectToMultiValuesObject(result);
}

interface GetAuthLinkResponse {
  status: boolean;
  url: string;
  oauthToken: string;
  oauthTokenSecret: string;
}

export async function getAuthLink(
  params: GetAuthLinkParam,
  mode: "authorize" | "authenticate",
): Promise<GetAuthLinkResponse> {
  const result = await getRequestToken(params);
  if (
    !result.status || typeof result.oauthToken !== "string" ||
    typeof result.oauthTokenSecret !== "string"
  ) {
    return { status: false, url: "", oauthToken: "", oauthTokenSecret: "" };
  }

  return {
    status: true,
    url:
      `https://api.twitter.com/oauth/${mode}?oauth_token=${result.oauthToken}`,
    oauthToken: result.oauthToken,
    oauthTokenSecret: result.oauthTokenSecret,
  };
}

export async function getAuthorizeLink(
  params: GetAuthLinkParam,
): Promise<GetAuthLinkResponse> {
  return await getAuthLink(params, "authorize");
}

export async function getAuthenticateLink(
  params: GetAuthLinkParam,
): Promise<GetAuthLinkResponse> {
  return await getAuthLink(params, "authenticate");
}

export async function getPinAuthLink(
  params: GetPinAuthLinkParam,
  mode: "authorize" | "authenticate",
): Promise<GetAuthLinkResponse> {
  const authParams = Object.assign(params, { oauthCallback: "oob" });
  return await getAuthLink(authParams, mode);
}

export async function getPinAuthorizeLink(
  params: GetPinAuthLinkParam,
): Promise<GetAuthLinkResponse> {
  return await getPinAuthLink(params, "authorize");
}

export async function getPinAuthenticateLink(
  params: GetPinAuthLinkParam,
): Promise<GetAuthLinkResponse> {
  return await getPinAuthLink(params, "authenticate");
}

import { assertEquals } from "https://deno.land/std@0.65.0/testing/asserts.ts";

Deno.test("twitter_lib", async (t) => {
  await t.step({
    name: "test #1 buildSignatureBase",
    fn: () => {
      const testParam: BuildSignatureBaseParam = {
        oauthConsumerKey: "xvz1evFS4wEEPTGEFPHBog",
        oauthTimestamp: "1318622958",
        oauthNonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
        oauthVersion: "1.0",
        method: "Post",
        oauthCallback: "oob",
        oauthSignatureMethod: "HMAC-SHA1",
      };
      const testResult =
        "POST&https%3A%2F%2Fapi.twitter.com%2Foauth%2Frequest_token&oauth_callback%3Doob%26oauth_consumer_key%3Dxvz1evFS4wEEPTGEFPHBog%26oauth_nonce%3DkYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1318622958%26oauth_version%3D1.0";

      const result = buildSignatureBase(testParam);

      assertEquals(testResult, result);
    },
  });

  await t.step({
    name: "test #2 buildSignatureKey",
    fn: () => {
      const testParam: BuildSignatureKeyParam = {
        oauthConsumerSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
      };
      const testResult = "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw&";

      const result = buildSignatureKey(testParam);

      assertEquals(testResult, result);
    },
  });

  await t.step({
    name: "test #3 buildSignature",
    fn: () => {
      const testParam: BuildSignatureParam = {
        method: "Post",
        oauthConsumerKey: "xvz1evFS4wEEPTGEFPHBog",
        oauthConsumerSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
        oauthTimestamp: "1318622958",
        oauthNonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
        oauthVersion: "1.0",
        oauthCallback: "oob",
        oauthSignatureMethod: "HMAC-SHA1",
      };
      const testResult = "KJmaxYxSHztR8Our3DFAqE2xBgw%3D";

      const result = buildSignature(testParam);

      assertEquals(testResult, result);
    },
  });
});
