var defaultconfig = require('./config.json');
var config = {serverPort: 1200}
if (config) {
    var Config = Object.assign(defaultconfig, config);
}

console.log(Config)