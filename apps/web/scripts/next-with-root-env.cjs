const { resolve } = require('node:path');

require('dotenv').config({
  path: resolve(__dirname, '../../../.env'),
});

require('next/dist/bin/next');
