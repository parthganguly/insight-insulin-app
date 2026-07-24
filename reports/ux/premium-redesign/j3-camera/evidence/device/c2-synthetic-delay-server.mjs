import { createServer } from "node:http";

const DELAY_MS = 60_000;

createServer((request, response) => {
	response.setHeader("Access-Control-Allow-Origin", "*");
	response.setHeader("Access-Control-Allow-Headers", "content-type");

	if (request.method === "OPTIONS") {
		response.writeHead(204);
		response.end();
		return;
	}

	request.resume();
	request.on("end", () => {
		setTimeout(() => {
			response.writeHead(503, { "Content-Type": "application/json" });
			response.end(JSON.stringify({ detail: "Synthetic delayed failure for J3 physical loading evidence." }));
		}, DELAY_MS);
	});
}).listen(8000, "127.0.0.1", () => {
	console.log(`J3 synthetic delay server listening on 127.0.0.1:8000 (${DELAY_MS} ms delay)`);
});
