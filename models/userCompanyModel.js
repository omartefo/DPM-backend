const Sequelize = require('sequelize');
const db = require('../db');

const UserCompany = db.define('company', 
{
	companyId: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		allowNull: false,
		primaryKey: true
	},
	name: {
		type: Sequelize.STRING,
		allowNull: false
	},
	commercialRegNumber: {
		type: Sequelize.STRING,
		allowNull: false
	},
	address: {
		type: Sequelize.STRING,
		allowNull: false,
	},
	totalEmployees: {
		type: Sequelize.INTEGER,
		allowNull: false
	}
});

exports.UserCompany = UserCompany;