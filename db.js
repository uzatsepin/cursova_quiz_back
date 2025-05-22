const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://andrii:Pa3wtj1X@159.69.201.149:5434/cursova'
});

module.exports = {
    query: (text, params) => pool.query(text, params)
}; 