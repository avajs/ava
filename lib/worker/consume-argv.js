'use strict';
require('./options').set(JSON.parse(process.argv[2]));

// Remove arguments received from fork.js and leave those specified by the user.
process.argv.splice(2, 2);
