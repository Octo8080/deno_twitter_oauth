import { camelCase, snakeCase } from "https://deno.land/x/case@v2.1.0/mod.ts";

export interface ObjectOfStringKey {
  [key: string]: string;
}

export interface ObjectOfStringKeyAnyValue {
  [key: string]: any;
}

export const stringValuesObjectToMultiValuesObject = (
  src: ObjectOfStringKey,
): ObjectOfStringKeyAnyValue => {
  const result: ObjectOfStringKeyAnyValue = {};

  console.log("//////////////");
  console.log(result);

  (Object.keys(src) as (keyof typeof src)[])
    .forEach((key) => {
      if (typeof key === "string") {
        result[camelCase(key)] = src[key];
      }
    });
  
  console.log(result);

  (Object.keys(result) as (keyof typeof result)[])
    .forEach((key) => {
      if (["true", "false"].includes(result[key].toString().toLowerCase())) {
        result[key] = result[key].toString().toLowerCase() === "true";
        return;
      }
      if (!isNaN(Number(result[key]))) {
        result[key] = parseInt(result[key]);
        return;
      }
    });

  console.log(result);

  return result;
};

export const selectObject = <T>(
  srcObject: T,
  requestProperties: (keyof T)[],
): Omit<T, keyof T> => {
  let result: Omit<T, keyof T> = Object.assign({}, srcObject);
  const removeProperties = <(keyof T)[]> (
    Object.keys(srcObject).filter(
      (key: string) => !requestProperties.includes(<keyof T> key),
    )
  );

  removeProperties.forEach((key: keyof T) => {
    const { [key]: _, ...tmp } = result;
    result = tmp;
  });

  return result;
};

export const stringQueryToObject = <T>(
  src: string,
  requestObject: ObjectOfStringKey,
): ObjectOfStringKey => {
  const splitedSrc = src.split("&").map((p) => p.split("="));
  const requestObjectkeys = Object.keys(requestObject);
  const tmpObject: ObjectOfStringKey = Object.assign({}, requestObject);

  requestObjectkeys.forEach((p) => {
    const item = splitedSrc.filter((item) => camelCase(item[0]) === p)[0];
    if (!item) return;

    tmpObject[p] = item[1];
  });

  return tmpObject;
};

import { assertEquals } from "https://deno.land/std@0.65.0/testing/asserts.ts";

Deno.test({
  name: "test #1 selectObject - 1",
  fn: () => {
    const testParam = { a: 1, b: 2, c: 3 };
    const result = selectObject(testParam, ["a", "b"]);
    const testResult = { a: 1, b: 2 };

    assertEquals(testResult, result);
  },
});

Deno.test({
  name: "test #2 selectObject - 2",
  fn: () => {
    const testParam = { a: 1, b: 2, c: 3 };
    const result = selectObject(testParam, ["c"]);
    const testResult = { c: 3 };

    assertEquals(testResult, result);
  },
});

Deno.test({
  name: "test #3 selectObject - 3",
  fn: () => {
    const testParam = { a: 1, b: 2, c: 3 };
    const result = selectObject(testParam, []);
    const testResult = {};

    assertEquals(testResult, result);
  },
});

Deno.test({
  name: "test #4 stringQueryToObject - 1",
  fn: () => {
    const testSrc = "a=AA&b=BB&c=CC";
    const testParam = { a: "", b: "", c: "" };
    const result = stringQueryToObject(testSrc, testParam);
    const testResult = { a: "AA", b: "BB", c: "CC" };

    assertEquals(testResult, result);
  },
});

Deno.test({
  name: "test #5 stringQueryToObject - 2",
  fn: () => {
    const testSrc = "a=AA&b=BB&d=DD";
    const testParam = { a: "", b: "", c: "" };
    const result = stringQueryToObject(testSrc, testParam);
    const testResult = { a: "AA", b: "BB", c: "" };

    assertEquals(testResult, result);
  },
});

Deno.test({
  name: "test #6 stringQueryToObject - 3",
  fn: () => {
    const testSrc = "a=AA&b=BB&d=DD";
    const testParam = { a: "", b: "", d: "" };
    const result = stringQueryToObject(testSrc, testParam);
    const testResult = { a: "AA", b: "BB", d: "DD" };

    assertEquals(testResult, result);
  },
});

Deno.test({
  name: "test #6 stringQueryToObject - 4",
  fn: () => {
    const testSrc = "a_a=AA&b_b=BB&d_dd_dd=DD";
    const testParam = { aA: "", bB: "", dDdDd: "" };
    const result = stringQueryToObject(testSrc, testParam);
    const testResult = { aA: "AA", bB: "BB", dDdDd: "DD" };

    assertEquals(testResult, result);
  },
});
