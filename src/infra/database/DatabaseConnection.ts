export default interface DatabaseConnection {
	query (statement: string, params: any): Promise<any>;
	// Unit of Work: todas as queries feitas na connection recebida por work
	// fazem commit juntas; se work lançar, rollback total.
	transaction<T> (work: (connection: DatabaseConnection) => Promise<T>): Promise<T>;
	close (): Promise<void>;
}