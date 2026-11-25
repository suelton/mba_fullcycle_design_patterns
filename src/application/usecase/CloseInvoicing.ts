import ContractRepository from "../repository/ContractRepository";
import InvoiceRepository, { InvoiceRecord } from "../repository/InvoiceRepository";
import PresenterFactory from "../presenter/PresenterFactory";
import Usecase from "./Usecase";
import Mediator from "../Mediator";
import { Output } from "./GenerateInvoices";

export default class CloseInvoicing implements Usecase {

	constructor (
		readonly contractRepository: ContractRepository,
		readonly invoiceRepository: InvoiceRepository,
		readonly presenterFactory: PresenterFactory,
		readonly mediator: Mediator
	) {
	}

	async execute (input: Input): Promise<any> {
		const presenter = this.presenterFactory.create(input.format); // falha antes de qualquer efeito
		const records: InvoiceRecord[] = [];
		const output: Output[] = [];
		const contracts = await this.contractRepository.list();
		for (const contract of contracts) {
			for (const invoice of contract.generateInvoices(input.month, input.year, input.type)) {
				records.push({ idContract: contract.idContract, date: invoice.date, amount: invoice.amount });
				output.push({ date: invoice.date, amount: invoice.amount });
			}
		}
		await this.invoiceRepository.replacePeriod(input.month, input.year, input.type, records);
		const total = output.reduce((sum, invoice) => sum + invoice.amount, 0);
		await this.mediator.publish("InvoicesClosed", { month: input.month, year: input.year, type: input.type, invoices: output.length, total });
		return presenter.present(output);
	}
}

type Input = {
	month: number,
	year: number,
	type: string,
	format?: string
}