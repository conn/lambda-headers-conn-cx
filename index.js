'use strict';

const url = require('url');

exports.handler = function (event, context, callback) {
  const request = event.Records[0].cf.request;
  const pathname = url.parse(request.uri).pathname;
  const contentLists = [/^\/albums\/$/, /^\/tags\//];

  const response = event.Records[0].cf.response;

  if (response.status === '302') {
    response.status = '301';
    response.statusDescription = 'Moved Permanently';
  }

  const status = response.status;
  const headers = response.headers;
  const type = (status === '200') ? headers['content-type'][0].value : '';

  const isContentList = function () {
    return contentLists.find(function (pattern) {
      return pattern.test(pathname);
    });
  };

  const cacheByPath = function () {
    if (status === '200' && isContentList()) return 'public, max-age=86400';
  };

  const cacheByMime = function () {
    switch(type) {
      case 'image/jpeg':
      case 'image/png':
      case 'image/svg+xml':
      case 'image/gif':
      case 'text/css':
      case 'application/javascript':
      case 'font/otf':
      case 'font/ttf':
      case 'application/font-sfnt':
      case 'image/vnd.microsoft.icon':
      case 'binary/octet-stream':
        return 'public, max-age=31536000';

      case 'text/html':
      case 'text/plain':
        return 'public, max-age=2592000';

      case 'application/xml':
        return 'public, max-age=86400';
    }
  };

  const cacheByStatus = function () {
    switch(status) {
      case '301':
        return 'public, max-age=31536000';

      case '302':
        return 'public, max-age=86400';

      case '304':
      case '400':
      case '403':
      case '404':
      case '500':
      case '503':
        return 'no-cache';
    }
  };

  const determineCacheTime = function () {
    return cacheByStatus() || cacheByPath() || cacheByMime() || 'no-cache' ;
  };

  headers['cache-control'] = [{
    key: 'Cache-Control',
    value: determineCacheTime()
  }];

  headers['strict-transport-security'] = [{
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubdomains; preload'
  }];

  headers['content-security-policy'] = [{
    key: 'Content-Security-Policy',

    value: [
      "default-src 'none';",
      "img-src 'self';",
      "script-src 'self';",
      "style-src 'self';",
      "font-src 'self';",
      "object-src 'none'"
    ].join(' ')
  }];

  headers['x-content-type-options'] = [{
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }];

  headers['x-frame-options'] = [{
    key: 'X-Frame-Options',
    value: 'DENY'
  }];

  headers['x-xss-protection'] = [{
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  }];

  headers['referrer-policy'] = [{
    key: 'Referrer-Policy',
    value: 'same-origin'
  }];

  callback(null, response);
};
