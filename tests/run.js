// Load every suite in this process so Node's test runner does not need workers.
require('./api-requests.test.js');
require('./api-client.test.js');
require('./eco-mode.test.js');
require('./site-integrity.test.js');
