require("dotenv").config();
const app = require('express')()
const http = require("http").createServer(app);
const next = require('next');
const io = require("socket.io")(http);

const dev = process.env.NODE_ENV !== 'production'
const server = next({ dev })
const handle = server.getRequestHandler()

io.on("connection",(socket) => {
    socket.on("message", (data) => {
        io.sockets.emit("new",data);
    })
})

server.prepare()
.then(() => {
  app.get('*', handle)
    
  http.listen(3000, (err) => {
    console.log('> Ready on http://localhost:3000')
  })
})

