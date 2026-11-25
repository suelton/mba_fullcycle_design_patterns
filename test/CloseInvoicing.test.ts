import { randomUUID } from "crypto";
import CloseInvoicing from "../src/application/usecase/CloseInvoicing";
import GetInvoices from "../src/application/usecase/GetInvoices";
import Contract from "../src/domain/Contract";
import ContractDatabaseRepository from "../src/infra/repository/ContractDatabaseRepository";
import InvoiceDatabaseRepository from "../src/infra/repository/InvoiceDatabaseRepository";
import PgPromiseAdapter from "../src/infra/database/PgPromiseAdapter";
import PresenterFactoryImpl from "../src/infra/presenter/PresenterFactoryImpl";
import ContractRepository from "../src/application/repository/ContractRepository";

// integration
let connection: PgPromiseAdapter;
let contractRepository: ContractDatabaseRepository;
let invoiceRepository: InvoiceDatabaseRepository;
let published: { event: string, data: any }[];
let closeInvoicing: CloseInvoicing;

async function count (month: number, year: number, type: string) {
	const rows = await connection.query("select count(*)::int as total from branas.invoice where month = $1 and year = $2 and type = $3", [month, year, type]);
	return rows[0].total;
}

beforeEach(async () => {
	connection = new PgPromiseAdapter();
	await connection.query("delete from branas.invoice", []);
	contractRepository = new ContractDatabaseRepository(connection);
	invoiceRepository = new InvoiceDatabaseRepository(connection);
	published = [];
	const mediator = { async publish (event: string, data: any) { published.push({ event, data }); } };
	closeInvoicing = new CloseInvoicing(contractRepository, invoiceRepository, new PresenterFactoryImpl(), mediator);
});

afterEach(async () => {
	await connection.close();
});

test("Deve fechar o faturamento de ponta a ponta e consultar em seguida", async function () {
	const input = { month: 1, year: 2022, type: "accrual" };
	const output = await closeInvoicing.execute(input);
	expect(output).toEqual([{ date: new Date("2022-01-01T13:00:00Z"), amount: 500 }]);
	expect(await count(1, 2022, "accrual")).toBe(1);
	const getInvoices = new GetInvoices(invoiceRepository, new PresenterFactoryImpl());
	expect(await getInvoices.execute(input)).toEqual(output);
	expect(published).toEqual([{ event: "InvoicesClosed", data: { month: 1, year: 2022, type: "accrual", invoices: 1, total: 500 } }]);
});

test("Deve responder lista vazia ao consultar período sem faturas", async function () {
	const getInvoices = new GetInvoices(invoiceRepository, new PresenterFactoryImpl());
	expect(await getInvoices.execute({ month: 3, year: 2023, type: "cash" })).toEqual([]);
});

test("Deve substituir o fechamento anterior sem duplicar as faturas", async function () {
	const input = { month: 1, year: 2022, type: "accrual" };
	await closeInvoicing.execute(input);
	await closeInvoicing.execute(input);
	expect(await count(1, 2022, "accrual")).toBe(1);
});

test("Deve fechar período sem faturas removendo as antigas", async function () {
	const [contract] = await contractRepository.list();
	await invoiceRepository.replacePeriod(1, 2023, "cash", [{ idContract: contract.idContract, date: new Date(), amount: 1 }]);
	expect(await closeInvoicing.execute({ month: 1, year: 2023, type: "cash" })).toEqual([]);
	expect(await count(1, 2023, "cash")).toBe(0);
});

test("Deve fechar o faturamento em csv", async function () {
	const output = await closeInvoicing.execute({ month: 1, year: 2022, type: "cash", format: "csv" });
	expect(output).toBe("2022-01-05;6000");
});

test("Não deve alterar nada com format inválido", async function () {
	await closeInvoicing.execute({ month: 1, year: 2022, type: "accrual" });
	await expect(closeInvoicing.execute({ month: 1, year: 2022, type: "accrual", format: "xml" })).rejects.toThrow(new Error("Invalid format"));
	expect(await count(1, 2022, "accrual")).toBe(1);
});

test("Não deve fechar com type inválido", async function () {
	await expect(closeInvoicing.execute({ month: 1, year: 2022, type: "other" })).rejects.toThrow(new Error("Invalid type"));
});

test("Deve fazer rollback total se uma fatura do lote falhar, preservando o fechamento anterior", async function () {
	const input = { month: 1, year: 2022, type: "accrual" };
	await closeInvoicing.execute(input);
	const before = await connection.query("select id_invoice, amount from branas.invoice", []);
	// o segundo contrato não existe no banco: a FK falha no meio do lote, depois da remoção e da primeira inserção
	const [realContract] = await contractRepository.list();
	const ghostContract = new Contract(randomUUID(), "fantasma", 6000, 12, new Date("2022-01-01T10:00:00"));
	const faultyContractRepository: ContractRepository = { async list () { return [realContract, ghostContract]; } };
	const faulty = new CloseInvoicing(faultyContractRepository, invoiceRepository, new PresenterFactoryImpl(), { async publish () {} });
	await expect(faulty.execute(input)).rejects.toThrow();
	const after = await connection.query("select id_invoice, amount from branas.invoice", []);
	expect(after).toEqual(before);
	expect(after).toHaveLength(1);
});
