export type InvoiceRecord = {
	idContract: string,
	date: Date,
	amount: number
}

export default interface InvoiceRepository {
	// Substitui, de forma atômica, as faturas do período/regime pelas informadas.
	replacePeriod (month: number, year: number, type: string, invoices: InvoiceRecord[]): Promise<void>;
	// Faturas fechadas do período/regime, ordenadas por date crescente.
	list (month: number, year: number, type: string): Promise<{ date: Date, amount: number }[]>;
}