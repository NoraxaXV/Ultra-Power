"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
app.use(express.static('public'));
app.use(express.static('public/assets'));
app.use(express.static('public/assets/map'));
app.get('/', (req, res) => {
    res.sendFile('public/index.html', { root: __dirname });
});
app.listen(port, () => {
    console.log('server started! :), port = ' + port);
});
//# sourceMappingURL=server.js.map