var shared = require('shared-examples-for');
var Promise = require('promise');

var Mappersmith = require('../index');
var Utils = Mappersmith.Utils;
var Mapper = Mappersmith.Mapper;

describe('Mapper', function() {
  var mapper,
      manifest,
      test,
      gateway;

  beforeEach(function() {
    manifest = {
      host: 'http://full-url',
      emulateHTTP: false,
      resources: {
        Book: {
          all:  {path: '/v1/books.json'},
          byId: {path: '/v1/books/{id}.json'},
          byUrl:  {path: '{url}', host: ''},
          AltById:  {path: '/v1/books/{id}.json', host: 'http://alt-url'},
          archived: '/v1/books/archived.json',
          byCategory: 'get:/v1/books/{category}/all.json'
        },
        Photo: {
          byCategory: {
            path: '/v1/photos/{category}/all.json',
            beforeSend: function(gateway) {}
          },
          add: {method: 'post', path: '/v1/photos/create.json'},
          byId: {
            path: '/v1/photos/{id}.json',
            processor: function(data) {
              return data.thumb;
            }
          },
          byYear: {
            path: '/v1/photos/{year}.json',
            params: {year: 2015, category: 'cats'}
          }
        }
      }
    }

    test = {};
    test.gateway = function() {};
    test.gateway.prototype.get = function() {return this};
    test.gateway.prototype.success = function() {return this};
    test.gateway.prototype.call = function() {return this};
    test.gateway.prototype.promisify = function() {return Promise.resolve(true)};
    test.gateway.prototype.setErrorHandler = function() {};
    test.gateway.prototype.setSuccessHandler = function() {};

    sinon.spy(test, 'gateway');
    sinon.spy(test.gateway.prototype, 'get');
    sinon.spy(test.gateway.prototype, 'success');
    sinon.spy(test.gateway.prototype, 'call');
    sinon.spy(test.gateway.prototype, 'promisify');
    sinon.spy(test.gateway.prototype, 'setErrorHandler');
    sinon.spy(test.gateway.prototype, 'setSuccessHandler');

    gateway = test.gateway;
    mapper = new Mapper(manifest, gateway);
  });

  afterEach(function() {
    test.gateway.restore();
    test.gateway.prototype.get.restore();
    test.gateway.prototype.success.restore();
    test.gateway.prototype.call.restore();
    test.gateway.prototype.promisify.restore();
  });

  describe('contructor', function() {
    it('holds a reference to manifest', function() {
      expect(mapper).to.have.property('manifest', manifest);
    });

    it('holds a reference to gateway', function() {
      expect(mapper).to.have.property('Gateway', gateway);
    });

    it('holds a reference to bodyAttr', function() {
      mapper = new Mapper(manifest, gateway, 'data');
      expect(mapper).to.have.property('bodyAttr', 'data');
    });

    it('holds a reference to rules', function() {
      manifest.rules = [];
      mapper = new Mapper(manifest, gateway);
      expect(mapper).to.have.property('rules', manifest.rules);
    });

    it('has a default value for rules', function() {
      expect(manifest.rules).to.be.undefined;
      expect(mapper.rules).to.eql([]);
    });

    it('holds a reference to rules', function() {
      manifest.rules = [];
      mapper = new Mapper(manifest, gateway);
      expect(mapper).to.have.property('rules', manifest.rules);
    });

    it('has a default value for rules', function() {
      expect(manifest.rules).to.be.undefined;
      expect(mapper.rules).to.eql([]);
    });
  });

  describe('#newGatewayRequest', function() {
    var method,
        host,
        fullUrl,
        path,
        resolvedPath,
        params,
        callback;

    beforeEach(function() {
      method = 'get';
      host = mapper.resolveHost();
      path = '/path';
      resolvedPath = mapper.resolvePath(path, {a: true});
      fullUrl =  host + path;
      params = {a: true};
      callback = Utils.noop;
    });

    it('returns a function', function() {
      var output = typeof mapper.newGatewayRequest({method: method, path: path});
      expect(output).to.equals('function');
    });

    it('returns a configured gateway', function() {
      var request = mapper.newGatewayRequest({method: method, host: host, path: path});
      fullUrl = host + resolvedPath;

      expect(request(params, callback)).to.be.an.instanceof(gateway);
      expect(gateway.prototype.success).to.have.been.calledWith(callback);
      expect(gateway.prototype.call).to.have.been.called;
      expect(gateway).to.have.been.calledWith({
        url: fullUrl,
        host: host,
        path: resolvedPath,
        method: method,
        params: params
      });
    });

    it('calls gateway#setSuccessHandler with globalSuccessHandler', function() {
      var successHandler = function() {};
      mapper.globalSuccessHandler = successHandler;
      var request = mapper.newGatewayRequest({method: method, host: host, path: path});
      expect(request(params, callback)).to.be.an.instanceof(gateway);
      expect(gateway.prototype.setSuccessHandler).to.have.been.calledWith(successHandler);
    });

    it('calls gateway#setErrorHandler with globalErrorHandler', function() {
      var errorHandler = function() {};
      mapper.globalErrorHandler = errorHandler;
      var request = mapper.newGatewayRequest({method: method, host: host, path: path});
      expect(request(params, callback)).to.be.an.instanceof(gateway);
      expect(gateway.prototype.setErrorHandler).to.have.been.calledWith(errorHandler);
    });

    describe('with host false', function() {
      shared.examplesFor('path with host "false"', function() {
        it('keeps the configured path', function() {
          var request = mapper.newGatewayRequest({method: method, host: host, path: path});
          expect(request(callback)).to.be.an.instanceof(gateway);
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
          expect(gateway.prototype.call).to.have.been.called;
          expect(gateway).to.have.been.calledWith({
            url: path,
            host: '',
            path: path,
            method: method
          });
        });
      });

      beforeEach(function() {
        host = false;
      });

      describe('and path without leading slash', function() {
        beforeEach(function() {
          path = 'path'; //without leading slash
        });

        shared.shouldBehaveLike('path with host "false"');
      });

      describe('and path with leading slash', function() {
        beforeEach(function() {
          path = '/path';
        });

        shared.shouldBehaveLike('path with host "false"');
      });
    });

    describe('without params', function() {
      it('considers callback as the first argument', function() {
        var request = mapper.newGatewayRequest({method: method, host: host, path: path});

        expect(request(callback)).to.be.an.instanceof(gateway);
        expect(gateway.prototype.success).to.have.been.calledWith(callback);
        expect(gateway.prototype.call).to.have.been.called;
        expect(gateway).to.have.been.calledWith({
          url: fullUrl,
          host: host,
          path: path,
          method: method
        });
      });

      describe('with opts for gateway', function() {
        it('considers opts as the second argument', function() {
          var opts = {jsonp: true};
          var request = mapper.newGatewayRequest({
            method: method,
            host: host,
            path: path
          });

          expect(request(callback, opts)).to.be.an.instanceof(gateway);
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
          expect(gateway.prototype.call).to.have.been.called;
          expect(gateway).to.have.been.calledWith({
            url: fullUrl,
            host: host,
            path: path,
            method: method,
            opts: opts
          });
        });
      });
    });

    describe('with params and opts but without callback', function() {
      it('considers opts as the second argument', function() {
        var opts = {jsonp: true};
        var request = mapper.newGatewayRequest({
          method: method,
          host: host,
          path: path
        });
        fullUrl = host + resolvedPath;

        expect(request(params, opts)).to.be.an.instanceof(gateway);
        expect(gateway.prototype.success).to.have.been.calledWith(Utils.noop);
        expect(gateway.prototype.call).to.have.been.called;
        expect(gateway).to.have.been.calledWith({
          url: fullUrl,
          host: host,
          path: resolvedPath,
          method: method,
          opts: opts,
          params: params,
        });
      });
    })

    describe('with body param', function() {
      it('includes the value defined by bodyAttr in the key "body"', function() {
        mapper.bodyAttr = 'body';
        params[mapper.bodyAttr] = 'some-value';
        fullUrl = host + resolvedPath;

        var request = mapper.newGatewayRequest({method: method, host: host, path: path});
        var result = {
          url: fullUrl,
          host: host,
          path: resolvedPath,
          params: params,
          method: method
        }

        result[mapper.bodyAttr] = params[mapper.bodyAttr];

        expect(request(params, callback)).to.be.an.instanceof(gateway);
        expect(gateway.prototype.success).to.have.been.calledWith(callback);
        expect(gateway.prototype.call).to.have.been.called;
        expect(gateway).to.have.been.calledWith(result);
      });
    });

    describe('with configured rules', function() {
      var opts;

      beforeEach(function() {
        path = manifest.resources.Book.all.path;
        fullUrl = host + path;
      });

      shared.examplesFor('merged rules', function() {
        it('always merge with gateway opts and processor', function() {
          var request = mapper.newGatewayRequest({
            method: method,
            host: host,
            path: path
          });

          expect(request(callback)).to.be.an.instanceof(gateway);
          expect(gateway).to.have.been.calledWith({
            url: fullUrl,
            host: host,
            path: path,
            method: method,
            opts: opts.gateway,
            processor: opts.processor,
            beforeSend: opts.beforeSend,
          });
        });
      });

      describe('global', function() {
        beforeEach(function() {
          opts = {
            gateway: {global: true},
            processor: Utils.noop,
            beforeSend: Utils.noop
          };
          manifest.rules = [{values: opts}];
          mapper = new Mapper(manifest, gateway);
        });

        shared.shouldBehaveLike('merged rules');
      });

      describe('url match', function() {
        beforeEach(function() {
          opts = {
            gateway: {matchUrl: true},
            processor: Utils.noop,
            beforeSend: Utils.noop
          };
          manifest.rules = [{match: /\/v1\/books/, values: opts}];
          mapper = new Mapper(manifest, gateway);
        });

        shared.shouldBehaveLike('merged rules');

        describe('matching against dynamic parts of the URL', function() {
          beforeEach(function() {
            manifest.rules = [{match: /\/v1\/books\/cats\/all\.json/, values: opts}];
            mapper = new Mapper(manifest, gateway);
          });

          it('merge the configured rules', function() {
            fullUrl = host + '/v1/books/cats/all.json';
            var request = mapper.newGatewayRequest({
              method: method,
              host: host,
              path: '/v1/books/{category}/all.json',
              params: {category: 'cats'}
            });

            expect(request(callback)).to.be.an.instanceof(gateway);
            expect(gateway).to.have.been.calledWith({
              url: fullUrl,
              host: host,
              path: '/v1/books/cats/all.json',
              params: {category: 'cats'},
              method: method,
              opts: {matchUrl: true},
              processor: opts.processor,
              beforeSend: opts.beforeSend
            });
          });

          describe('when the dynamic part doesn\'t match', function() {
            it('doesn\'t merge the rules', function() {
              fullUrl = host + '/v1/books/dogs/all.json';
              var request = mapper.newGatewayRequest({
                method: method,
                host: host,
                path: '/v1/books/{category}/all.json',
                params: {category: 'dogs'}
              });

              expect(request(callback)).to.be.an.instanceof(gateway);
              expect(gateway).to.have.been.calledWith({
                url: fullUrl,
                host: host,
                path: '/v1/books/dogs/all.json',
                params: {category: 'dogs'},
                method: method
              });
            });
          });
        });
      });

      describe('mixed', function() {
        var optsMatch;

        beforeEach(function() {
          opts = {
            gateway: {global: true, headers: {a: 1}},
            processor: function globalMatch() {},
            beforeSend: function beforeSendGlobalMatch() {}
          };
          optsMatch = {
            gateway: {matchUrl: true, headers: {b: 2}},
            processor: function urlMatch() {},
            beforeSend: function beforeSendUrlMatch() {}
          };

          manifest.rules = [
            {values: opts},
            {match: /\/v1\/books/, values: optsMatch}
          ];

          mapper = new Mapper(manifest, gateway);
        });

        it('merges both rules, using natural precedence for prioritization', function() {
          var request = mapper.newGatewayRequest({
            method: method,
            host: host,
            path: path
          });

          expect(request(callback)).to.be.an.instanceof(gateway);
          expect(gateway).to.have.been.calledWith({
            url: fullUrl,
            host: host,
            path: path,
            method: method,
            opts: {global: true, headers: {a: 1, b: 2}, matchUrl: true},
            processor: optsMatch.processor,
            beforeSend: optsMatch.beforeSend
          });
        });

        it('merges both rules with local header definition', function() {
          var request = mapper.newGatewayRequest({
            method: method,
            host: host,
            path: path
          });

          var localHeader = { Authorization: 'token my'};
          var expectedHeaders = {a: 1, b: 2, Authorization: 'token my'}
          var output = request({headers: localHeader}, callback)

          expect(output).to.be.an.instanceof(gateway);
          expect(gateway).to.have.been.calledWith({
            url: fullUrl,
            host: host,
            path: path,
            method: method,
            params: {},
            opts: {global: true, headers: expectedHeaders, matchUrl: true},
            processor: optsMatch.processor,
            beforeSend: optsMatch.beforeSend
          });
        });
      });

      describe('with default params', function() {
        var descriptor, request, host, path;

        beforeEach(function() {
          descriptor = manifest.resources.Photo.byYear;
          descriptor.host = 'http://other-host';
          descriptor.method = method;
          request = mapper.newGatewayRequest(descriptor);

          host = mapper.resolveHost(descriptor.host);
          path = mapper.resolvePath(descriptor.path, descriptor.params);
          fullUrl = host + path;
        });

        describe('without params in method call', function() {
          it('uses the configured default parameters', function() {
            expect(request(callback)).to.be.an.instanceof(gateway);
            expect(gateway).to.have.been.calledWith({
              url: fullUrl,
              host: host,
              path: path,
              params: descriptor.params,
              method: descriptor.method
            });
          });
        });

        describe('with params in method call', function() {
          it('merges with the given params', function() {
            var methodParams = {category: 'dogs'};
            var mergedParams = Utils.extend({}, descriptor.params, methodParams);
            path = mapper.resolvePath(descriptor.path, mergedParams);
            fullUrl = host + path;

            expect(request(methodParams, callback)).to.be.an.instanceof(gateway);
            expect(gateway).to.have.been.calledWith({
              url: fullUrl,
              host: host,
              path: path,
              method: descriptor.method,
              params: mergedParams
            });
          });
        });
      });
    });
  });

  describe('#host', function() {
    describe('with manifest host', function() {
      beforeEach(function() {
        mapper.manifest.host = 'http://some-host/';
      });

      it('removes the trailing slash if configured', function() {
        expect(mapper.resolveHost()).to.equals('http://some-host');
      });
    });

    describe('with an alternative host', function() {
      beforeEach(function() {
        mapper.manifest.host = 'http://some-host/';
      });

      it('removes the trailing slash if configured', function() {
        expect(mapper.resolveHost('http://other-host/')).to.equals('http://other-host');
      });

      it('returns a blank string when value is "false"', function() {
        expect(mapper.resolveHost(false)).to.equals('');
      });
    });
  });

  describe('#path', function() {
    describe('without params and query string', function() {
      it('returns resolved path', function() {
        expect(mapper.resolvePath('/path')).to.equals('/path');
      });
    });

    describe('with bodyAttr in params', function() {
      it('does not include into the resolved path', function() {
        var params = {};
        params[mapper.bodyAttr] = 'some-value';
        expect(mapper.resolvePath('/path', params)).to.equals('/path');
      });
    });

    describe('with params in the definition', function() {
      it('replaces params and returns resolved path', function() {
        expect(mapper.resolvePath('{a}/{b}', {a: 1, b: 2})).to.equals('1/2');
      });
    });

    describe('with query string in the definition', function() {
      it('includes query string into the resolved path', function() {
        expect(mapper.resolvePath('path', {a: 1, b: 2})).to.equals('path?a=1&b=2');
      });
    });

    describe('with query string and params in the definition', function() {
      it('includes query string and replaces params into the resolved path', function() {
        expect(mapper.resolvePath('{a}', {a: 1, b: 2})).to.equals('1?b=2');
      });
    });
  });

  describe('#build', function() {
    var result;

    beforeEach(function() {
      result = mapper.build();
    });

    it('returns an object with a method "onError"', function() {
      expect(result).to.be.a('object');
      expect(result.onError).to.be.a('function');
    });

    describe('when calling "onSuccess" on the returned object', function() {
      it('assigns the global success handler', function() {
        var successHandler = function() {};
        expect(mapper.globalSuccessHandler).to.equal(Utils.noop);
        result.onSuccess(successHandler);
        expect(mapper.globalSuccessHandler).to.equal(successHandler);
      });
    });

    describe('when calling "onError" on the returned object', function() {
      it('assigns the global error handler', function() {
        var errorHandler = function() {};
        expect(mapper.globalErrorHandler).to.equal(Utils.noop);
        result.onError(errorHandler);
        expect(mapper.globalErrorHandler).to.equal(errorHandler);
      });
    });

    it('creates the namespaces', function() {
      expect(result.Book).to.be.a('object');
      expect(result.Photo).to.be.a('object');
    });

    it('creates configured methods for each namespace', function() {
      expect(result.Book.all).to.be.a('function');
      expect(result.Book.byId).to.be.a('function');
      expect(result.Book.byUrl).to.be.a('function');
      expect(result.Book.AltById).to.be.a('function');
      expect(result.Book.archived).to.be.a('function');
      expect(result.Photo.byCategory).to.be.a('function');
    });

    describe('when calling the created methods', function() {
      var callback, method;

      beforeEach(function() {
        callback = function() {};
        method = 'get';
      });

      describe('without params', function() {
        it('calls the gateway with the configured values', function() {
          var path = manifest.resources.Book.all.path;
          var url = mapper.resolveHost() + path;

          result.Book.all(callback);
          expect(gateway).to.have.been.calledWith({
            url: url,
            host: mapper.resolveHost(),
            path: path,
            method: method
          });
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
        });
      });

      describe('with query string', function() {
        it('calls the gateway with the configured values', function() {
          var path = manifest.resources.Book.all.path;
          var params = {b: 2};
          var resolvedPath = mapper.resolvePath(path, params);
          var url = mapper.resolveHost() + resolvedPath;

          result.Book.all(params, callback);
          expect(gateway).to.have.been.calledWith({
            url: url,
            host: mapper.resolveHost(),
            path: resolvedPath,
            params: params,
            method: method
          });
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
        });
      });

      describe('with params in the path', function() {
        it('calls the gateway with the configured values', function() {
          var path = manifest.resources.Book.byId.path;
          var params = {id: 3};
          var resolvedPath = mapper.resolvePath(path, params);
          var url = mapper.resolveHost() + resolvedPath;

          result.Book.byId(params, callback);
          expect(gateway).to.have.been.calledWith({
            url: url,
            host: mapper.resolveHost(),
            path: resolvedPath,
            params: params,
            method: method
          });
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
        });
      });

      describe('with params in the path and query string', function() {
        it('calls the gateway with the configured values', function() {
          var path = manifest.resources.Book.byId.path;
          var params = {id: 3, d: 4};
          var resolvedPath = mapper.resolvePath(path, params);
          var url = mapper.resolveHost() + resolvedPath;

          result.Book.byId(params, callback);
          expect(gateway).to.have.been.calledWith({
            url: url,
            host: mapper.resolveHost(),
            path: resolvedPath,
            params: params,
            method: method
          });
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
        });
      });

      describe('with params in the path, query string and an alternative empty host', function() {
        it('calls the gateway with the configured values', function() {
          var path = manifest.resources.Book.byUrl.path;
          var host = manifest.resources.Book.byUrl.host;
          var paramUrl = 'http://alt-full-url/v1/books/1.json';
          var params = {url: paramUrl};

          var resolvedHost = mapper.resolveHost(host);
          var resolvedPath = mapper.resolvePath(path, params);
          var url = resolvedHost + resolvedPath;

          result.Book.byUrl(params, callback);
          expect(gateway).to.have.been.calledWith({
            url: url,
            host: resolvedHost,
            path: resolvedPath,
            params: params,
            method: method
          });
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
        });
      });

      describe('with params in the path, query string and an alternate host', function() {
        it('calls the gateway with the configured values', function() {
          var path = manifest.resources.Book.AltById.path;
          var host = manifest.resources.Book.AltById.host;
          var params = {id: 3, d: 4};

          var resolvedHost = mapper.resolveHost(host);
          var resolvedPath = mapper.resolvePath(path, params);
          var url = resolvedHost + resolvedPath;

          result.Book.AltById(params, callback);
          expect(gateway).to.have.been.calledWith({
            url: url,
            host: resolvedHost,
            path: resolvedPath,
            params: params,
            method: method
          });
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
        });
      });

      describe('with non-default method', function() {
        it('calls the gateway with the configured values', function() {
          var path = manifest.resources.Photo.add.path;
          var url = mapper.resolveHost() + path;
          method = 'post';

          result.Photo.add(callback);
          expect(gateway).to.have.been.calledWith({
            url: url,
            host: mapper.resolveHost(),
            path: path,
            method: method
          });
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
        });
      });

      describe('with syntatic sugar for GET methods with no parameters', function() {
        it('calls the gateway with method GET', function() {
          var path = manifest.resources.Book.archived;
          var url = mapper.resolveHost() + path;

          result.Book.archived(callback);
          expect(gateway).to.have.been.calledWith({
            url: url,
            host: mapper.resolveHost(),
            path: path,
            method: method
          });
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
        });

        it('calls the gateway with query string', function() {
          var path = manifest.resources.Book.archived;
          var params = {author: 'Daniel'};
          var resolvedPath = mapper.resolvePath(path, params);
          var url = mapper.resolveHost() + resolvedPath;

          result.Book.archived(params, callback);
          expect(gateway).to.have.been.calledWith({
            url: url,
            host: mapper.resolveHost(),
            path: resolvedPath,
            params: params,
            method: method
          });
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
        });
      });

      describe('resource definition compact syntax', function() {
        it('parses HTTP method and URL', function() {
          var compactDefinition = manifest.resources.Book.byCategory;
          var definitionComponents = compactDefinition.split(':');
          expect(definitionComponents).to.have.length(2);

          var method = definitionComponents[0];
          var path = definitionComponents[1];

          var url = mapper.resolveHost() + path;

          result.Book.byCategory(callback);
          expect(gateway).to.have.been.calledWith({
            url: url,
            host: mapper.resolveHost(),
            path: path,
            method: method
          });
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
        });

        ['get', 'post', 'delete', 'put', 'patch'].forEach(function(methodName) {
          describe('methods', function() {
            beforeEach(function() {
              manifest = {
                host: 'http://full-url',
                resources: {
                  Book: {
                    test: methodName + ':/v1/books.json'
                  }
                }
              }
              mapper = new Mapper(manifest, gateway);
              result = mapper.build();
            });

            it('supports method ' + methodName , function() {
              result.Book.test();
              var path = '/v1/books.json';
              expect(gateway).to.have.been.calledWith({
                url: mapper.resolveHost() + path,
                host: mapper.resolveHost(),
                path: path,
                method: methodName
              });
            });
          });
        });
      });

      describe('processors', function() {
        it('it\'s passed to gateway', function() {
          var path = manifest.resources.Photo.byId.path;
          var processor = manifest.resources.Photo.byId.processor;
          var params = {id: 3};
          var resolvedPath = mapper.resolvePath(path, params);
          var url = mapper.resolveHost() + resolvedPath;

          result.Photo.byId(params, callback);
          expect(gateway).to.have.been.calledWith({
            url: url,
            host: mapper.resolveHost(),
            path: resolvedPath,
            params: params,
            method: method,
            processor: processor
          });
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
        });
      });

      describe('beforeSend', function() {
        it('it\'s passed to gateway', function() {
          var path = manifest.resources.Photo.byCategory.path;
          var beforeSend = manifest.resources.Photo.byCategory.beforeSend;
          var params = {category: 'unicorns'};
          var resolvedPath = mapper.resolvePath(path, params);
          var url = mapper.resolveHost() + resolvedPath;

          result.Photo.byCategory(params, callback);
          expect(gateway).to.have.been.calledWith({
            url: url,
            host: mapper.resolveHost(),
            path: resolvedPath,
            params: params,
            method: method,
            beforeSend: beforeSend
          });
          expect(gateway.prototype.success).to.have.been.calledWith(callback);
        });
      });
    });
  });

  describe('with promises enabled', function() {
    var method,
        host,
        fullUrl,
        path,
        resolvedPath,
        params,
        callback;

    beforeEach(function() {
      Mappersmith.Env.USE_PROMISES = true;

      method = 'get';
      host = mapper.resolveHost();
      path = '/path';
      resolvedPath = mapper.resolvePath(path, {a: true});
      fullUrl =  host + path;
      params = {a: true};
      callback = Utils.noop;
    });

    afterEach(function() {
      Mappersmith.Env.USE_PROMISES = false;
    });

    it('calls promisify with callback to generate a promise', function() {
      var request = mapper.newGatewayRequest({method: method, path: path});
      request(params, callback);
      expect(gateway.prototype.promisify).to.have.been.calledWith(callback);
    });

  })
});
