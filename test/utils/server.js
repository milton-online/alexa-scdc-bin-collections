/*

This source file is derived from https://github.com/node-fetch/node-fetch/blob/master/test/utils/server.js

It is therefore excluded from the  licence covering the rest of this application, and instead has the following licence and copyright:

The MIT License (MIT)

Copyright (c) 2016 - 2020 Node Fetch Team

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
const http = require("http");
const { once } = require("events");

module.exports = class TestServer {
    constructor() {
        this.server = http.createServer(this.router);
        // Node 8 default keepalive timeout is 5000ms
        // make it shorter here as we want to close server quickly at the end of tests
        this.server.keepAliveTimeout = 1000;
        this.server.on("error", (err) => {
            console.error(err.stack);
        });
        this.server.on("connection", (socket) => {
            socket.setTimeout(1500);
        });
    }

    async start() {
        this.server.listen(0, "localhost");
        return once(this.server, "listening");
    }

    async stop() {
        this.server.close();
        return once(this.server, "close");
    }

    get port() {
        return this.server.address().port;
    }

    get hostname() {
        return "localhost";
    }

    router(request, res) {
        const p = request.url;

        if (p === "/json") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(
                JSON.stringify({
                    name: "value",
                })
            );
        }

        if (p === "/error/404") {
            res.statusCode = 404;
            res.setHeader("Content-Encoding", "gzip");
            res.end();
        }

        if (p === "/error/500") {
            res.statusCode = 500;
            res.setHeader("Content-Type", "text/plain");
            res.end("server error");
        }

        if (p === "/slow") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/plain");
            res.write("test");
            setTimeout(() => {
                res.end("test");
            }, 1000);
        }
    }
};
