import handler from '../api/check-transfers.js';

const req = {
  method: 'GET',
  headers: {},
  query: {},
  body: null,
};

const res = {
  statusCode: 200,
  headers: {},
  payload: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  setHeader(name, value) {
    this.headers[name] = value;
    return this;
  },
  json(body) {
    this.payload = body;
    return this;
  },
  send(body) {
    this.payload = body;
    return this;
  },
};

const run = async () => {
  await handler(req, res);
  console.log(`Status: ${res.statusCode}`);
  console.log('Response:');
  console.log(JSON.stringify(res.payload, null, 2));
};

run().catch((error) => {
  console.error('Handler execution failed:', error);
  process.exitCode = 1;
});
