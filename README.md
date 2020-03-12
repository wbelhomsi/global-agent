# global-agent-wbe

* [Usage](#usage)
* [FAQ](#faq)
 
## Usage

### npm install package

```js
npm install global-agent-wbe

```

```js
const { bootstrap } = require('global-agent-wbe');

const options = {
 proxyConfig: {
    scheme: 'http',
    host: 'proxy.example.com',
    port: 8080,
    username: 'username', // if empty doesnt use authentication
    password: 'password', // if empty doesnt use authentication
    https: {
      scheme: 'http',
      host: 'proxy.example.com',
      port: 8080,
      username: 'username', // if empty doesnt use authentication
      password: 'password', // if empty doesnt use authentication
    }
  },
  proxyFunc: function(options) { // Only uses proxy if the this function returns true
    return options.hostname.includes('microsoft');
  }
};
bootstrap(options);

```

This is useful if you need to conditionally bootstrap `global-agent`, e.g.

```js
const { bootstrap } = require('global-agent-wbe');
const { globalTunnel } = require('global-tunnel-ng');

const MAJOR_NODEJS_VERSION = parseInt(process.version.slice(1).split('.')[0], 10);

if (MAJOR_NODEJS_VERSION >= 10) {
  // `global-agent` works with Node.js v10 and above.
  const options = {
  proxyConfig: {
      scheme: 'http',
      host: 'proxy.example.com',
      port: 8080,
      username: 'username', // if empty doesnt use authentication
      password: 'password', // if empty doesnt use authentication
      https: {
        scheme: 'http',
        host: 'proxy.example.com',
        port: 8080,
        username: 'username', // if empty doesnt use authentication
        password: 'password', // if empty doesnt use authentication
      }
    },
    proxyFunc: function(options) { // Only uses proxy if the this function returns true
      return options.hostname.includes('microsoft');
    }
  };
  bootstrap(options);
} else {
  // `global-tunnel-ng` works only with Node.js v10 and below.
  globalTunnel.initialize();
}
```

## Supported libraries

`global-agent-wbe` works with all libraries that internally use [`http.request`](https://nodejs.org/api/http.html#http_http_request_options_callback).

`global-agent-wbe` has been tested to work with:

* [`got`](https://www.npmjs.com/package/got)
* [`axios`](https://www.npmjs.com/package/axios)
* [`request`](https://www.npmjs.com/package/axios)

## FAQ

### What is the reason `global-agent-wbe` overrides explicitly configured HTTP(S) agent?

By default, `global-agent-wbe` overrides [`agent` property](https://nodejs.org/api/http.html#http_http_request_options_callback) of any HTTP request, even if `agent` property was explicitly set when constructing a HTTP request. This behaviour allows to intercept requests of libraries that use a custom instance of an agent per default (e.g. Stripe SDK [uses an `http(s).globalAgent` instance pre-configured with `keepAlive: true`](https://github.com/stripe/stripe-node/blob/e542902dd8fbe591fe3c3ce07a7e89d1d60e4cf7/lib/StripeResource.js#L11-L12)).

In contrast, `global-agent-wbe` supports Node.js v10 and above, and does not implements workarounds for the older Node.js versions.
