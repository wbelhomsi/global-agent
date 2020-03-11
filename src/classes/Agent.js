// @flow

class Agent {
  constructor (
    isProxyConfigured,
    mustUrlUseProxy,
    getUrlProxy,
    fallbackAgent,
    socketConnectionTimeout,
  ) {
    this.defaultPort = null;
    this.protocol = null;
    this.fallbackAgent = fallbackAgent;
    this.isProxyConfigured = isProxyConfigured;
    this.mustUrlUseProxy = mustUrlUseProxy;
    this.getUrlProxy = getUrlProxy;
    this.socketConnectionTimeout = socketConnectionTimeout;
  }

  addRequest (request, configuration) {
    let requestUrl;

    // It is possible that addRequest was constructed for a proxied request already, e.g.
    // "request" package does this when it detects that a proxy should be used
    // https://github.com/request/request/blob/212570b6971a732b8dd9f3c73354bcdda158a737/request.js#L402
    // https://gist.github.com/gajus/e2074cd3b747864ffeaabbd530d30218
    if (request.path.startsWith('http://') || request.path.startsWith('https://')) {
      requestUrl = request.path;
    } else {
      requestUrl = this.protocol + '//' + (configuration.hostname || configuration.host) +
                    (configuration.port === 80 || configuration.port === 443 ? '' : ':' + configuration.port) + request.path;
    }

    if (!this.isProxyConfigured()) {
      this.fallbackAgent.addRequest(request, configuration);

      return;
    }

    if (!this.mustUrlUseProxy(requestUrl)) {
      this.fallbackAgent.addRequest(request, configuration);

      return;
    }

    const proxy = this.getUrlProxy(requestUrl);

    if (this.protocol === 'http:') {
      request.path = requestUrl;

      if (proxy.authorization) {
        request.setHeader('proxy-authorization', 'Basic ' + Buffer.from(proxy.authorization).toString('base64'));
      }
    }

    request.shouldKeepAlive = false;

    const connectionConfiguration = {
      host: configuration.hostname || configuration.host,
      port: configuration.port || 80,
      proxy,
    };

    this.createConnection(connectionConfiguration, (error, socket) => {
      // @see https://github.com/nodejs/node/issues/5757#issuecomment-305969057
      if (socket) {
        socket.setTimeout(this.socketConnectionTimeout, () => {
          socket.destroy();
        });

        socket.once('connect', () => {
          socket.setTimeout(0);
        });

        socket.once('secureConnect', () => {
          socket.setTimeout(0);
        });
      }

      if (error) {
        request.emit('error', error);
      } else {
        request.onSocket(socket);
      }
    });
  }
}

export default Agent;
