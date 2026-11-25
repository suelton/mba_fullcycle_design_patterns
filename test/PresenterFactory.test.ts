import CsvPresenter from "../src/infra/presenter/CsvPresenter";
import JsonPresenter from "../src/infra/presenter/JsonPresenter";
import PresenterFactoryImpl from "../src/infra/presenter/PresenterFactoryImpl";

const factory = new PresenterFactoryImpl();

test("Deve criar o presenter json", function () {
	expect(factory.create("json")).toBeInstanceOf(JsonPresenter);
});

test("Deve criar o presenter json quando o format não é informado", function () {
	expect(factory.create()).toBeInstanceOf(JsonPresenter);
});

test("Deve criar o presenter csv", function () {
	expect(factory.create("csv")).toBeInstanceOf(CsvPresenter);
});

test("Não deve criar o presenter com format inválido", function () {
	expect(() => factory.create("xml")).toThrow(new Error("Invalid format"));
});
