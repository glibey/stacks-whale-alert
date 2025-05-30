const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

// Run your existing co
require('./bot');  // or include your existing index.js logic

app.get('/', (req, res) => {
  res.send('Service is running.');
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
