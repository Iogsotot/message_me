import { HTTPParser } from 'http-parser-js';

export function parseRequest(input) {
  const parser = new HTTPParser(HTTPParser.REQUEST);
  let complete = false;
  let shouldKeepAlive;
  let upgrade;
  let method;
  let url;
  let versionMajor;
  let versionMinor;
  let headers = [];
  let trailers = [];
  const bodyChunks = [];

  parser[HTTPParser.kOnHeadersComplete] = function (req) {
    shouldKeepAlive = req.shouldKeepAlive;
    upgrade = req.upgrade;
    method = HTTPParser.methods[req.method];
    url = req.url;
    versionMajor = req.versionMajor;
    versionMinor = req.versionMinor;
    headers = req.headers;
  };

  parser[HTTPParser.kOnBody] = function (chunk, offset, length) {
    bodyChunks.push(chunk.slice(offset, offset + length));
  };

  // This is actually the event for trailers, go figure.
  parser[HTTPParser.kOnHeaders] = function (t) {
    trailers = t;
  };

  parser[HTTPParser.kOnMessageComplete] = function () {
    complete = true;
  };

  // Since we are sending the entire Buffer at once here all callbacks above happen synchronously.
  // The parser does not do _anything_ asynchronous.
  // However, you can of course call execute() multiple times with multiple chunks, e.g. from a stream.
  // But then you have to refactor the entire logic to be async (e.g. resolve a Promise in kOnMessageComplete and add timeout logic).
  parser.execute(input);
  parser.finish();

  if (!complete) {
    throw new Error('Could not parse request');
  }

  const body = Buffer.concat(bodyChunks);

  return {
    shouldKeepAlive,
    upgrade,
    method,
    url,
    versionMajor,
    versionMinor,
    headers,
    body,
    trailers,
  };
}
