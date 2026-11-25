import ContractDatabaseRepository from "./infra/repository/ContractDatabaseRepository";
import ExpressAdapter from "./infra/http/ExpressAdapter";
import GenerateInvoices from "./application/usecase/GenerateInvoices";
import CloseInvoicing from "./application/usecase/CloseInvoicing";
import GetInvoices from "./application/usecase/GetInvoices";
import InvoiceDatabaseRepository from "./infra/repository/InvoiceDatabaseRepository";
import PresenterFactoryImpl from "./infra/presenter/PresenterFactoryImpl";
import LoggerDecorator from "./application/decorator/LoggerDecorator";
import MainController from "./infra/http/MainController";
import InvoicingController from "./infra/http/InvoicingController";
import PgPromiseAdapter from "./infra/database/PgPromiseAdapter";
import Mediator from "./infra/mediator/Mediator";
import SendEmail from "./application/usecase/SendEmail";

const connection = new PgPromiseAdapter();
const contractRepository = new ContractDatabaseRepository(connection);
const invoiceRepository = new InvoiceDatabaseRepository(connection);
const presenterFactory = new PresenterFactoryImpl();
const mediator = new Mediator();
const sendEmail = new SendEmail();
mediator.on("InvoicesGenerated", async function (data: any) {
	await sendEmail.execute(data);
});
mediator.on("InvoicesClosed", async function (data: any) {
	await sendEmail.execute(data);
});
const generateInvoices = new LoggerDecorator(new GenerateInvoices(contractRepository, presenterFactory, mediator));
const closeInvoicing = new LoggerDecorator(new CloseInvoicing(contractRepository, invoiceRepository, presenterFactory, mediator));
const getInvoices = new GetInvoices(invoiceRepository, presenterFactory);
const httpServer = new ExpressAdapter();
new MainController(httpServer, generateInvoices);
new InvoicingController(httpServer, closeInvoicing, getInvoices);
httpServer.listen(3000);