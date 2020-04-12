import * as express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.static('public/assets'));
app.use(express.static('public/assets/map'));
app.use(express.static('public/phaseer'));

app.get('/', (req: express.Request, res: express.Response) => {
	res.sendFile('public/index.html', { root: __dirname })
});

app.listen(port, () => {
	console.log('server started! :), port = '+port);
});
