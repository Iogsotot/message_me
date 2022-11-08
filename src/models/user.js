import Base from './base';

export default class User extends Base {
  /**
    * @protected
    * */
  getTable() {
    return 'users';
  }

  async getAll() {
    const sql = `SELECT * FROM ${this.getTable()}`;
    const rows = await this.db.query(sql);
    return rows || [];
  }

  async getById(id, record) {
    return super.read(id, record);
  }

  async getByLogin(login) {
    const sql = `SELECT * FROM ${this.getTable()} WHERE login=$1`;
    const { rows } = await this.db.query(sql, [login]);
    if (rows.length) {
      return rows[0];
    }
    return null;
  }

  async getByEmail(email) {
    const sql = `SELECT * FROM ${this.getTable()} WHERE email=$1`;
    const { rows } = await this.db.query(sql, [email]);
    if (rows.length) {
      return rows[0];
    }
    return null;
  }

  async login(username, password) {
    const sql = `SELECT id, name, surname, login FROM ${this.getTable()} WHERE login=$1 AND password=$2`;
    const { rows } = await this.db.query(sql, [username, password]);
    if (rows.length) {
      return rows[0];
    }
    return null;
  }
}
