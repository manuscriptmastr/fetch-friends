import test from 'ava';
import nock from 'nock';
import fetch from 'node-fetch';
import apply from 'ramda/src/apply.js';
import memoizeWith from 'ramda/src/memoizeWith.js';
import pipe from 'ramda/src/pipe.js';
import tap from 'ramda/src/tap.js';
import decorate, {
  basicAuthHeader,
  bearerAuthHeader,
  body,
  headers,
  json,
  method,
  option,
  options,
  rejectIfNotOkay,
  timeout
} from './index.js';

const MOCK_API = 'http://testing123.test';

test.afterEach(nock.cleanAll);

test('basicAuthHeader(username, password) returns an object with basic auth header', t => {
  t.deepEqual(
    basicAuthHeader('daniel', 'w1ll0wtree'),
    { 'Authorization': 'Basic ZGFuaWVsOncxbGwwd3RyZWU=' }
  );
});

test('bearerAuthHeader(token) returns an object with bearer auth header', t => {
  t.deepEqual(
    bearerAuthHeader('abcdefg'),
    { 'Authorization': 'Bearer abcdefg' }
  );
});

test('body(fetch) adds body to opts', async t => {
  const fakeFetch = async (...args) => args;
  const args = await body(fakeFetch)(
    { hello: 'world' },
    '123.com',
    { headers: { 'Some-Header': 'Some-Value' } }
  );
  t.deepEqual(args, ['123.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Some-Header': 'Some-Value'
    },
    body: '{"hello":"world"}'
  }]);
});

test('decorate(fn, decorators) passes in original arguments to fn', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await decorate(fakeFetch, [fetch => (...args) => fetch(...args)])('123.com'),
    ['123.com']
  );
  t.deepEqual(
    await decorate(fakeFetch, [fetch => (...args) => fetch(...args)])('123.com', {}),
    ['123.com', {}]
  );
});

test('decorate(fn, decorators) can manipulate arguments before passing to fn', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await decorate(fakeFetch, [
      fetch => (body, url, opts = {}) => fetch(url, { ...opts, body: JSON.stringify(body) })
    ])({ message: 'hello' }, '123.com'),
    ['123.com', { body: '{"message":"hello"}' }]
  );
});

test('decorate(fn, decorators) performs decorators in left-to-right, top-to-bottom fashion', async t => {
  const fakeFetch = async (...args) => args;
  const post = decorate(fakeFetch, [
    fetch => (body, url, opts = {}) => fetch(url, { ...opts, body: JSON.stringify(body) }),
    fetch => (url, opts = {}) => fetch(url, { ...opts, method: 'POST' })
  ]);
  t.deepEqual(
    await post({ message: 'hello' }, '123.com'),
    ['123.com', { body: '{"message":"hello"}', method: 'POST' }]
  );
});

test('decorate(fn, decorators) partially invokes decorators with fn before args are passed in', async t => {
  let timesCalled = 0;
  const fakeFetch = async (...args) => args;
  const fakeFetchWithIncrement = pipe((...args) => args, tap(() => { timesCalled += 1 }), apply(fakeFetch));

  const cachedFetch = decorate(fakeFetchWithIncrement, [
    fetch => (...args) => fetch(...args),
    memoizeWith((...args) => JSON.stringify(args)),
    fetch => (...args) => fetch(...args)
  ]);

  const fetch1 = await cachedFetch('123.com');
  t.deepEqual(fetch1, ['123.com']);
  t.deepEqual(timesCalled, 1);

  const fetch2 = await cachedFetch('123.com');
  t.deepEqual(fetch2, ['123.com']);
  t.deepEqual(timesCalled, 1);

  const fetch3 = await cachedFetch('123.com', { method: 'GET' });
  t.deepEqual(fetch3, ['123.com', { method: 'GET' }]);
  t.deepEqual(timesCalled, 2);

  const fetch4 = await cachedFetch('123.com/wat');
  t.deepEqual(fetch4, ['123.com/wat']);
  t.deepEqual(timesCalled, 3);
});

test('headers(objectOrFn)(fetch) deep merges headers object with passed in options', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await headers({ 'Authorization': 'Bearer 123' })(fakeFetch)('123.com', { method: 'GET' }),
    ['123.com', { method: 'GET', headers: { 'Authorization': 'Bearer 123' } }]
  );
});

test('headers(objectOrFn)(fetch) deep merges result of calling headers function', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await headers(() => ({ 'Authorization': 'Bearer 123' }))(fakeFetch)('123.com', { headers: { 'Content-Type': 'application/json' } }),
    ['123.com', { headers: { 'Authorization': 'Bearer 123', 'Content-Type': 'application/json' } }]
  );
});

test('headers(objectOrFn)(fetch) deep merges result of calling async headers function', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await headers(async () => ({ 'Authorization': 'Bearer 123' }))(fakeFetch)('123.com', { headers: { 'Content-Type': 'application/json' } }),
    ['123.com', { headers: { 'Authorization': 'Bearer 123', 'Content-Type': 'application/json' } }]
  );
});

test('headers(objectOrFn)(fetch) does not overwrite previously passed in headers', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await headers(() => ({ 'Content-Type': 'application/xml' }))(fakeFetch)('123.com', { headers: { 'Content-Type': 'application/json' } }),
    ['123.com', { headers: { 'Content-Type': 'application/json' } }]
  );
});

test('json(response) calls response.json()', async t => {
  const fakeFetch = async () => ({ json: async () => ({ message: 'hello' }) });
  t.deepEqual(
    await fakeFetch().then(json),
    { message: 'hello' }
  );
});

test('method(METHOD)(fetch) adds method to opts', async t => {
  const fakeFetch = async (...args) => args;
  const args = await method('POST')(fakeFetch)('123.com')
  t.deepEqual(args, ['123.com', { method: 'POST' }]);
});

test('method(METHOD)(fetch) does not interfere with other opts', async t => {
  const fakeFetch = async (...args) => args;
  const args = await headers({ 'Some-Header': 'Some-Value' })(method('POST')(fakeFetch))('123.com')
  t.deepEqual(args, ['123.com', { method: 'POST', headers: { 'Some-Header': 'Some-Value' } }]);
});

test('option(key, value)(fetch) injects option into final fetch call', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await option('method', 'POST')(fakeFetch)('123.com'),
    ['123.com', { method: 'POST' }]
  );
});

test('option(key, value)(fetch) does not overwrite previously passed in options', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await option('method', 'POST')(fakeFetch)('123.com', { method: 'GET' }),
    ['123.com', { method: 'GET' }]
  );
});

test('option(key, value)(fetch) merges option with other passed in options', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await option('method', 'POST')(fakeFetch)('123.com', { headers: { 'Content-Type': 'application/json' } }),
    ['123.com', { method: 'POST', headers: { 'Content-Type': 'application/json' } }]
  );
});

test('options(objectOrFn)(fetch) merges options object even when initial options are not passed in', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await options({ method: 'GET' })(fakeFetch)('123.com'),
    ['123.com', { method: 'GET' }]
  );
});

test('options(objectOrFn)(fetch) does not overwrite previously passed in options', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await options({ method: 'POST' })(fakeFetch)('123.com', { method: 'GET' }),
    ['123.com', { method: 'GET' }]
  );
});

test('options(objectOrFn)(fetch) merges options object with other passed in options', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await options({ method: 'GET' })(fakeFetch)('123.com', { body: 'yeet' }),
    ['123.com', { method: 'GET', body: 'yeet' }]
  );
});

test('options(objectOrFn)(fetch) accepts merge function', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await options(opts => ({ ...opts, method: 'GET' }))(fakeFetch)('123.com', { body: 'yeet' }),
    ['123.com', { method: 'GET', body: 'yeet' }]
  );
});

test('options(objectOrFn)(fetch) accepts async merge function', async t => {
  const fakeFetch = async (...args) => args;
  t.deepEqual(
    await options(async opts => ({ ...opts, method: 'GET' }))(fakeFetch)('123.com', { body: 'yeet' }),
    ['123.com', { method: 'GET', body: 'yeet' }]
  );
});

test.serial('promise.then(rejectIfNotOkay) does not interfere with good statuses', async t => {
  const scope = nock(MOCK_API)
    .get('/')
    .reply(200, { hello: 'world' });
  t.deepEqual(
    await fetch(MOCK_API).then(rejectIfNotOkay).then(res => res.json()),
    { hello: 'world' }
  );
  scope.done();
});

test.serial('promise.then(rejectIfNotOkay) throws for bad statuses', async t => {
  const scope = nock(MOCK_API)
    .get('/')
    .reply(400, { message: 'Yeet' });
  await t.throwsAsync(
    fetch(MOCK_API).then(rejectIfNotOkay).then(res => res.json()),
    { instanceOf: Error, message: 'Bad Request' }
  );
  scope.done();
});

test('timeout(ms)(fetch) injects signal into fetch call', async t => {
  const fakeFetch = async (...args) => args;
  const [url, { signal }] = await timeout(3000, fakeFetch)('123.com');
  t.deepEqual(url, '123.com');
  t.truthy(signal);
});

test('timeout(ms)(fetch) merges signal with other options into fetch call', async t => {
  const fakeFetch = async (...args) => args;
  const [url, { method, signal }] = await timeout(3000, fakeFetch)('123.com', { method: 'GET' });
  t.deepEqual(url, '123.com');
  t.deepEqual(method, 'GET');
  t.truthy(signal);
});

test.serial('timeout(ms)(fetch) returns result of fetch when shorter than ms', async t => {
  const scope = nock(MOCK_API)
    .get('/')
    .reply(200, { hello: 'world' });
  t.deepEqual(
    await timeout(250)(fetch)(MOCK_API).then(res => res.json()),
    { hello: 'world' }
  );
  scope.done();
});

test.serial('timeout(ms)(fetch) throws AbortError when fetch is longer than ms', async t => {
  const scope = nock(MOCK_API)
    .get('/')
    .delayConnection(7000)
    .reply(200, { hello: 'world' });

  await t.throwsAsync(
    () => timeout(150)(fetch)(MOCK_API).then(res => res.json()),
    { name: 'AbortError', message: `The user aborted a request.` }
  );
  scope.done();
});
