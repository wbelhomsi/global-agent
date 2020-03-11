// @flow

import http from 'http';
import https from 'https';
import semver from 'semver';
import {
  HttpProxyAgent,
  HttpsProxyAgent,
} from '../classes';
import {
  UnexpectedStateError,
} from '../errors';
import {
  bindHttpMethod,
  parseProxyUrl,
} from '../utilities';

const httpGet = http.get;
const httpRequest = http.request;
const httpsGet = https.get;
const httpsRequest = https.request;

const defaultConfigurationInput = {
  forceGlobalAgent: undefined,
  socketConnectionTimeout: 60000,
};

const omitUndefined = (subject) => {
  const keys = Object.keys(subject);

  const result = {};

  for (const key of keys) {
    const value = subject[key];

    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
};

const createConfiguration = (configurationInput) => {
  const defaultConfiguration = {
    forceGlobalAgent: true,
    socketConnectionTimeout: defaultConfigurationInput.socketConnectionTimeout,
  };

  return {
    ...defaultConfiguration,
    ...omitUndefined(configurationInput),
  };
};

const getProxyUrl = (proxyConfig) => {
  if (!proxyConfig) {
    return null;
  }
  if (typeof proxyConfig === 'string') {
    return proxyConfig;
  }
  if (proxyConfig.username && proxyConfig.password) {
    return proxyConfig.scheme + '://' + encodeURIComponent(proxyConfig.username) + ':' +
                encodeURIComponent(proxyConfig.password) + '@' + proxyConfig.host + ':' + proxyConfig.port;
  }

  return proxyConfig.scheme + '://' + proxyConfig.host + ':' + proxyConfig.port;
};

export default (configurationInput = defaultConfigurationInput) => {
  const configuration = createConfiguration(configurationInput);

  const proxyFunc = configurationInput.proxyFunc;
  const noProxyFunc = configurationInput.noProxyFunc;

  const proxyUrl = getProxyUrl(configurationInput.proxyConfig);
  const proxyUrlHttps = getProxyUrl(configurationInput.proxyConfig.https) || proxyUrl;

  const proxyController = {
    noProxyFunc,
    proxy: {
      http: proxyUrl,
      https: proxyUrlHttps,
    },
    proxyFunc,
  };

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const mustUrlUseProxy = (getProxy) => {
    return (url) => {
      if (!getProxy()) {
        return false;
      }

      if (proxyController.proxyFunc) {
        const doProxy = proxyController.proxyFunc(new URL(url));
        if (doProxy !== undefined) {
          return Boolean(doProxy);
        }
      }

      if (proxyController.noProxyFunc) {
        const doNotProxy = proxyController.noProxyFunc(new URL(url));
        if (doNotProxy !== undefined) {
          return !Boolean(doNotProxy);
        }
      }

      return true;
    };
  };

  // eslint-disable-next-line unicorn/consistent-function-scoping
  const getUrlProxy = (getProxy) => {
    return () => {
      const proxy = getProxy();

      if (!proxy) {
        throw new UnexpectedStateError('HTTP(S) proxy must be configured.');
      }

      return parseProxyUrl(proxy);
    };
  };

  const getHttpProxy = () => {
    return proxyController.proxy.http;
  };

  const BoundHttpProxyAgent = class extends HttpProxyAgent {
    constructor () {
      super(
        () => {
          return getHttpProxy();
        },
        mustUrlUseProxy(getHttpProxy),
        getUrlProxy(getHttpProxy),
        http.globalAgent,
        configuration.socketConnectionTimeout,
      );
    }
  };

  const httpAgent = new BoundHttpProxyAgent();

  const getHttpsProxy = () => {
    return proxyController.proxy.https;
  };

  const BoundHttpsProxyAgent = class extends HttpsProxyAgent {
    constructor () {
      super(
        () => {
          return getHttpsProxy();
        },
        mustUrlUseProxy(getHttpsProxy),
        getUrlProxy(getHttpsProxy),
        https.globalAgent,
        configuration.socketConnectionTimeout,
      );
    }
  };

  const httpsAgent = new BoundHttpsProxyAgent();

  // Overriding globalAgent was added in v11.7.
  // @see https://nodejs.org/uk/blog/release/v11.7.0/
  if (semver.gte(process.version, 'v11.7.0')) {
    // @see https://github.com/facebook/flow/issues/7670
    http.globalAgent = httpAgent;

    https.globalAgent = httpsAgent;
  }

  // The reason this logic is used in addition to overriding http(s).globalAgent
  // is because there is no guarantee that we set http(s).globalAgent variable
  // before an instance of http(s).Agent has been already constructed by someone,
  // e.g. Stripe SDK creates instances of http(s).Agent at the top-level.
  // @see https://github.com/gajus/global-agent/pull/13
  //
  // We still want to override http(s).globalAgent when possible to enable logic
  // in `bindHttpMethod`.
  if (semver.gte(process.version, 'v10.0.0')) {
    http.get = bindHttpMethod(httpGet, httpAgent, configuration.forceGlobalAgent);

    http.request = bindHttpMethod(httpRequest, httpAgent, configuration.forceGlobalAgent);

    https.get = bindHttpMethod(httpsGet, httpsAgent, configuration.forceGlobalAgent);

    https.request = bindHttpMethod(httpsRequest, httpsAgent, configuration.forceGlobalAgent);
  }

  return proxyController;
};
