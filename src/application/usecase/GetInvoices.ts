import InvoiceRepository from "../repository/InvoiceRepository";
import PresenterFactory from "../presenter/PresenterFactory";
import Usecase from "./Usecase";

export default class GetInvoices implements Usecase {

	constructor (readonly invoiceRepository: InvoiceRepository, readonly presenterFactory: PresenterFactory) {
	}

	async execute (input: Input): Promise<any> {
		const presenter = this.presenterFactory.create(input.format);
		const invoices = await this.invoiceRepository.list(input.month, input.year, input.type);
		return presenter.present(invoices.map(invoice => ({ date: invoice.date, amount: invoice.amount })));
	}
}

type Input = {
	month: number,
	year: number,
	type: string,
	format?: string
}