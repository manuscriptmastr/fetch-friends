import AbortController from 'abort-controller';
import andThen from 'ramda/src/andThen.js';
import apply from 'ramda/src/apply.js';
import compose from 'ramda/src/compose.js';
import curry from 'ramda/src/curry.js';
import is from 'ramda/src/is.js';
import mergeDeepLeft from 'ramda/src/mergeDeepLeft.js';
import pipe from 'ramda/src/pipe.js';

const raise = err => { throw err };

// fetch utils
export const json = res => res.json();
export const rejectIfNotOkay = res => res.ok ? res : raise(new Error(res.statusText));
export const basicAuthHeader = (username, password) =>
  ({ 'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`});
export const bearerAuthHeader = (token) =>
  ({ 'Authorization' : `Bearer ${token}` });

// fetch decorators
export const options = curry((decorate, fetch) => pipe(async (url, opts = {}) => [url, mergeDeepLeft(opts, is(Function, decorate) ? await decorate(opts) : decorate)], andThen(apply(fetch))));
export const option = curry((key, value, fetch) => options(async () => ({ [key]: is(Function, value) ? await value() : value }), fetch));
export const method = option('method');
export const headers = option('headers');
export const timeout = curry((ms, fetch) => option('signal', () => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
})(fetch));
export const body = fetch => (json, url, opts = {}) => options({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(json)
}, fetch)(url, opts);

// applies multiple decorators to fetch
export default (fn, decorators) => compose(...decorators)(fn);
