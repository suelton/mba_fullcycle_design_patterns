import HttpServer from "./HttpServer";
import Usecase from "../../application/usecase/Usecase";

export default class InvoicingController {

	constructor (readonly httpServer: HttpServer, readonly closeInvoicing: Usecase, readonly getInvoices: Usecase) {
		httpServer.on("post", "/close_invoicing", async function (params: any, body: any, headers: any) {
			const input = body;
			body.userAgent = headers["user-agent"];
			body.host = headers.host;
			return closeInvoicing.execute(input);
		});
		httpServer.on("get", "/invoices", async function (params: any, body: any, headers: any, query: any) {
			return getInvoices.execute({ month: Number(query.month), year: Number(query.year), type: query.type, format: query.format });
		});
	}
}