const app = require('./src/app');
const http = require('http');
require('dotenv/config');
const setupSocket = require('./src/socket/socket');
const { setIO } = require('./src/socket/notification');

const server = http.createServer(app);
const io = setupSocket(server);
setIO(io);

const Port = process.env.PORT ;

server.listen(Port, () => {
    console.log(`Server running on port ${Port}`);
});

//handle error
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(` Port ${Port} is already in use`);
    } else {
        console.error(err);
    }
});
