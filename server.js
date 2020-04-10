"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const app = express();
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});
app.listen(3000, () => {
    console.log('server started');
});
//# sourceMappingURL=server.js.map