import fs from 'fs';
import http from 'http';
import path from 'path';

const mimeTypes = {
	'.html': 'text/html',
	'.js': 'application/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.otf': 'font/otf',
	'.eot': 'application/vnd.ms-fontobject',
	'.xml': 'application/xml',
	'.pdf': 'application/pdf',
	'.txt': 'text/plain',
};

export default () => {
	let root;
	let vite;
	let server;
	const middlewares = [];

	const handleRequest = (req, res) => {
		let idx = 0;

		const next = (err) => {
			if (err) {
				res.writeHead(500);
				res.end(`Middleware error: ${err.message}`);
				console.error('Middleware error:', err);
				return;
			}

			const middleware = middlewares[idx++];
			if (middleware) {
				middleware(req, res, next);
			} else {
				if (process.env.ENV === 'production') {
					serveStatic(req, res);
				} else {
					vite.middlewares(req, res, (err) => {
						if (err) {
							res.writeHead(500);
							res.end(`Error: ${err.message}`);
							vite.ssrFixStacktrace(err);
							console.error('Error in Vite middlewares:', err);
						}
					});
				}
			}
		};

		next();
	};

	const serveStatic = (req, res) => {
		const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
		let filePath = path.join(root, parsedUrl.pathname);

		fs.stat(filePath, (err, stats) => {
			if (!err && stats.isFile()) {
				const extname = path.extname(filePath);
				const contentType = mimeTypes[extname] || 'application/octet-stream';
				fs.readFile(filePath, (err, content) => {
					if (err) {
						res.writeHead(500);
						res.end(`Error: ${err.code}`);
					} else {
						res.writeHead(200, { 'Content-Type': contentType });
						res.end(content, 'utf-8');
					}
				});
			} else {
				fs.readFile(path.join(root, 'index.html'), (err, content) => {
					if (err) {
						res.writeHead(500);
						res.end(`Error: ${err.code}`);
					} else {
						res.writeHead(200, { 'Content-Type': 'text/html' });
						res.end(content, 'utf-8');
					}
				});
			}
		});
	};

	return {
		middleware: (fn) => middlewares.push(fn),
		production: ({ root: rootPath }) => {
			root = rootPath;
			server = http.createServer(handleRequest);
		},
		development: ({ vite: viteInstance }) => {
			vite = viteInstance;
			server = http.createServer(handleRequest);
		},
		listen: (port) => server.listen(port || 3000, () => {
			console.log(`Http is serving on http://localhost:${port || 3000}/`);
		})
	}
};
