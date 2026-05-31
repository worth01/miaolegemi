const http = require('http');
const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', port: PORT, time: new Date().toISOString() }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on port ${PORT}`);
});
