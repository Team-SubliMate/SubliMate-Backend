const { Pool } = require('pg')

const pool = new Pool({
	user: 'pi',
	host: 'localhost',
	database: 'sublimate',
	password: 'sublimate',
	port: '5432'
})

module.exports = {
	query: (text, params, callback) => {
		return pool.query(text, params, callback)
	}
}
