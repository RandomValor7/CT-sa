export async function crearDb(config) {
  const mysql = await import('mysql2/promise');
  const pool = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    dateStrings: true,
    decimalNumbers: true,
    multipleStatements: false,
  });

  return {
    async query(sql, parametros = []) {
      const [filas] = await pool.query(sql, parametros);
      return filas;
    },
    async cerrar() {
      await pool.end();
    },
  };
}
