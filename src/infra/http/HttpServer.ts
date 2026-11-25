export default interface HttpServer {
	// Convenção do callback: (params, body, headers, query).
	// A resposta string é enviada como texto puro; objeto/array como JSON.
	on (method: string, url: string, callback: Function): void;
	listen (port: number): void;
}