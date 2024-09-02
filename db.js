const Sequelize = require('sequelize');

console.log('env variables ...');
console.log(process.env.DB_USER, process.env.USER, process.env.PASSWORD);

const connection = new Sequelize(process.env.DB_USER, process.env.USER, process.env.PASSWORD, {
	define: {
		charset: 'utf8',
		collate: 'utf8_general_ci', 
		timestamps: true
	},
	dialect: 'mysql',
	host: process.env.HOST,
});

module.exports = connection;