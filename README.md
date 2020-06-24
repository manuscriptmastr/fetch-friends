# fetch-friends
The `fetch` API is ubiquitous to the web. Use higher order functions to decorate `fetch` without changing its interface.

No need to replace `fetch` with a library just because you need timeout:
```js
import fetch from 'node-fetch';
import { timeout } from 'fetch-friends';

// fetch aborts when API takes longer than 5 seconds to respond
export default timeout(5000, fetch);
```

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
