var Utils = require('../utils');
var CreateGateway = require('../create-gateway');

var JQueryGateway = CreateGateway({

  init: function() {
    if (window.jQuery === undefined) {
      throw new Utils.Exception(
        'JQueryGateway requires jQuery but it was not found! ' +
        'Change the gateway implementation or add jQuery on the page'
      );
    }
  },

  get: function() {
    this._jQueryAjax(this.opts);
    return this;
  },

  post: function() {
    return this._performRequest('POST');
  },

  put: function() {
    return this._performRequest('PUT');
  },

  patch: function() {
    return this._performRequest('PATCH');
  },

  delete: function() {
    return this._performRequest('DELETE');
  },

  _performRequest: function(method) {
    var requestMethod = method;

    if (this.shouldEmulateHTTP(method)) {
      requestMethod = 'POST';
      this.body = this.body || {};
      if (typeof this.body === 'object') this.body._method = method;
      this.opts.headers = Utils.extend({'X-HTTP-Method-Override': method}, this.opts.headers);
    }

    var defaults = {type: requestMethod, data: Utils.params(this.body)};
    this._jQueryAjax(Utils.extend(defaults, this.opts));
    return this;
  },

  _jQueryAjax: function(config) {
    if (config.withCredentials) {
      delete config.withCredentials;
      config = Utils.extend(config, {xhrFields: {withCredentials: true}});
    }

    jQuery.ajax(Utils.extend({url: this.url}, config)).
      done(function(data, textStatus, xhr) {
        var headers = Utils.parseResponseHeaders(xhr.getAllResponseHeaders());
        this.successCallback(data, {status: xhr.status, responseHeaders: headers});

      }.bind(this)).
      fail(function(jqXHR) {
        this.failCallback({status: jqXHR.status, args: arguments});

      }.bind(this)).
      always(function() {
        this.completeCallback.apply(this, arguments);

      }.bind(this));
  }

});

module.exports = JQueryGateway;
