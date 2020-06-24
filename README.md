# fetch-friends

The `fetch` API is ubiquitous to the web. `fetch-friends` is a minimal, auto-curried utility library to decorate `fetch` with behaviors you might otherwise switch to another HTTP library for.

No need to replace `fetch` with a library just because you need timeout:
```js
import fetch from 'node-fetch';
import { timeout } from 'fetch-friends';

// fetch aborts when API takes longer than 5 seconds to respond
export default timeout(5000, fetch);
```

`fetch` is never mentioned in the source code, so `fetch-friends` can decorate any function with a matching type signature.

Use `decorate(fetch, decorators)` to elegantly compose higher order functions over `fetch`:
```js
import fetch from 'node-fetch';
import { limit } from 'semaphorejs';
import retry from 'min-retry';
import decorate, {
  bearerAuthHeader,
  headers,
  timeout
} from 'fetch-friends';

// fetch with token, timeout, retry, and concurrency limiting
export default decorate(fetch, [
  // fetch => (url, opts?) => Promise<Response>
  headers(bearerAuthHeader('sometoken123')),
  timeout(5000),
  retry(3),
  limit(10)
]);
```

Create advanced yet expressive flavors of `fetch`:
```js
import fetch from 'node-fetch';
import { andThen, pipe } from 'ramda';
import retry from 'min-retry';
import decorate, {
  bearerAuthToken,
  headers,
  json,
  method,
  rejectIfNotOkay,
  timeout
} from 'fetch-friends';

export {
  GET: pipe(
    decorate(fetch, [
      method('GET'),
      headers(bearerAuthToken(TOKEN)),
      timeout(5000),
      retry(3),
    ]),
    andThen(rejectIfNotOkay),
    andThen(json)
  ),
  DELETE: pipe(
    decorate(fetch, [
      method('DELETE'),
      headers(bearerAuthToken(TOKEN))
    ]),
    andThen(rejectIfNotOkay)
  ),
  POST: pipe(
    decorate(fetch, [
      body,
      headers(bearerAuthToken(TOKEN))
    ]),
    andThen(rejectIfNotOkay)
  )
};
```

## Fetch Decorators

Fetch decorators are higher order functions that add behavior on top of your `fetch(url, opts?)` implementation without changing the interface. All decorators are auto-curried except for the final `(url, opts?)` invocation.

Decorators that accept a function are lazily evaluated. This comes in handy for side effects like setting timeouts and getting an API token when `fetch` is called.

To apply multiple fetch decorators to `fetch`, use the default export `decorate`.

Like native `fetch`, the second argument `opts` is optional. Options passed in earlier always take precedence when a duplicate is found.

### `decorate(fetch, decorators)`

`decorate` applies multiple `fetch` decorators in left-to-right, top-to-bottom fashion:
```js
import fetch from 'node-fetch';
import decorate, { basicAuthHeader, headers, timeout } from 'fetch-friends';

export default decorate(fetch, [
  headers(basicAuthHeaders('joshua', 'm@rt1n')),
  timeout(5000)
]);
```

### `body(fetch)(json, url, opts?)`

`body` accepts a JSON payload:
```js
body(fetch)({ hello: 'world' }, '123.com', {});
// fetch('123.com', { body: JSON.stringify({ hello: 'world' })})
```

When combining with other decorators via `decorate`, place `body` at the top of the stack.

### `method(string, fetch)(url, opts?)`

`method` accepts a standard method string:
```js
method('GET', fetch)('123.com', {});
method('GET')(fetch)('123.com', {});
// fetch('123.com', { method: 'GET' })
```

### `headers(objectOrFn, fetch)(url, opts?)`

`headers` accepts an object, function, or async function:
```js
headers({ 'Authorization': 'Bearer 123.secret.456' }, fetch)('123.com', {});
headers({ 'Authorization': 'Bearer 123.secret.456' })(fetch)('123.com', {});
headers(async () => ({ `Authorization: Bearer ${await getToken()}` }), fetch)('123.com', {});
// fetch('123.com', { headers: { 'Authorization': 'Bearer 123.secret.456' } })
```

### `options(objectOrFn, fetch)(url, opts?)`

`options` accepts an object, function, or async function:
```js
options({ method: 'GET' }, fetch)('123.com', {});
options({ method: 'GET' })(fetch)('123.com', {});
// fetch('123.com', { method: 'GET' })
options(() => ({ signal: abort(5000) }), fetch)('123.com', {});
// fetch('123.com', { signal: AbortSignal })
```

### `option(key, valueOrFn, fetch)(url, opts?)`

`option` accepts a key and a value/function/async function:
```js
option('signal', () => abort(5000), fetch)('123.com', {});
option('signal', () => abort(5000))(fetch)('123.com', {});
option('signal')(() => abort(5000), fetch)('123.com', {});
option('signal')(() => abort(5000))(fetch)('123.com', {});
// fetch('123.com', { signal: AbortSignal })
```

### `timeout(millis, fetch)(url, opts?)`

`timeout` accepts a millisecond duration at which to abort a `fetch` call:
```js
timeout(5000, fetch)('123.com', {});
timeout(5000)(fetch)('123.com', {});
// fetch('123.com', { signal: AbortSignal })
```

## Fetch Helpers

Just some teeny helper functions.

### `abort(millis)`

`abort` sets a timeout and returns an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal):

```js
abort(5000);
// AbortSignal
```

### `basicAuthHeader(username, password)`

```js
basicAuthHeader('joshua', 'm@rt1n');
basicAuthHeader('joshua')('m@rt1n');
// { 'Authorization': 'Basic am9zaHVhOm1AcnQxbg==' }
```

### `bearerAuthHeader(token)`

```js
bearerAuthHeader('abcdefg');
// { 'Authorization': 'Bearer abcdefg' }
```

### `json(response)`

```js
fetch('/users').then(json);
// Promise<[{ id: 1 }, { id: 2 }, { id: 3 }]>
```

### `rejectIfNotOkay(response)`

`rejectIfNotOkay` throws an error if `response.ok` is false:
```js
fetch('/forbidden/users').then(rejectIfNotOkay);
// Promise<Error('Forbidden')>
```

## Related libraries

### [Ramda](https://github.com/ramda/ramda)

You may find yourself needing just a few utilities for `fetch-friends`. For convenience, this package includes the most common for composing over `fetch`:
- [`andThen(fn)`](https://ramdajs.com/docs/#andThen)
- [`compose(...fns)`](https://ramdajs.com/docs/#compose)
- [`once(fn)`](https://ramdajs.com/docs/#once)
- [`pipe(...fns)`](https://ramdajs.com/docs/#pipe)

### [`min-retry`](https://github.com/manuscriptmastr/min-retry)

Retries `fetch` on:
- `429` and `500...599` status codes
- `FetchError`
- `AbortError`

### [`semaphorejs`](https://github.com/nybblr/semaphorejs)

Decorates `fetch` with [semaphore behavior](https://en.wikipedia.org/wiki/Semaphore_(programming))
