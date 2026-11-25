import DatabaseConnection from "./DatabaseConnection";
import pgp from "pg-promise";

export default class PgPromiseAdapter implements DatabaseConnection {
	connection: any;

	constructor () {
		this.connection = pgp()("postgres://postgres:123456@localhost:5432/app");
	}

	query(statement: string, params: any): Promise<any> {
		return this.connection.query(statement, params);
	}

	transaction<T>(work: (connection: DatabaseConnection) => Promise<T>): Promise<T> {
		return this.connection.tx((t: any) => work(new PgPromiseTransaction(t)));
	}

	close(): Promise<void> {
		return this.connection.$pool.end();
	}

}

class PgPromiseTransaction implements DatabaseConnection {

	constructor (readonly t: any) {
	}

	query(statement: string, params: any): Promise<any> {
		return this.t.query(statement, params);
	}

	transaction<T>(work: (connection: DatabaseConnection) => Promise<T>): Promise<T> {
		return this.t.tx((nested: any) => work(new PgPromiseTransaction(nested)));
	}

	async close(): Promise<void> {
		// o ciclo de vida da connection pertence ao PgPromiseAdapter
	}
}