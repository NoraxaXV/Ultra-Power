import * as express from 'express';

const app = express();
app.use(express.static('public'));

app.get('/', (req: express.Request, res: express.Response) => {
	res.sendFile('public/index.html', { root: __dirname })
});

app.listen(3000, () => {
	console.log('server started');
});