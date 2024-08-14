const Sequelize = require('sequelize');
const Joi = require('joi');

const { User } = require('../models/userModel');
const db = require('../db');

const Project = db.define('project', 
{
	projectId: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		allowNull: false,
		primaryKey: true
	},
	name: {
		type: Sequelize.STRING,
		allowNull: false
	},
	location: {							// Doha, Al Rayyan, Umm Salal, Al Khor & Al Thakira, Al Wakrah, Al Daayen, Al Shamal, and Al Shahaniya
		type: Sequelize.STRING,
		allowNull: false,
	},
	description: {
		type: Sequelize.STRING(1000),
		allowNull: false
	},
	type: {								// Villa, Commercial Building, Industrial Project
		type: Sequelize.STRING,
		allowNull: false 
	},
	isApproved: {
		type: Sequelize.BOOLEAN,
		allowNull: false,
		defaultValue: false
	},
	image: Sequelize.STRING,
	clientId: {							// Project is always associated with a client, no project without a client;
		type: Sequelize.INTEGER,
		allowNull: false,
		references: {
			model: User,
			key: 'userId',
			onDelete: 'RESTRICT'
		}
	}
});

function validateUser(project) {
	const schema = Joi.object({
		name: Joi.string().required(),
		location: Joi.string().required(),
		description: Joi.string().required().max(1000),
		type: Joi.string().required(),
		isApproved: Joi.boolean().default(false),
		image: Joi.string(),
		clientId: Joi.number().required()
	});

	return schema.validate(project);
}

exports.validate = validateUser;
exports.Project = Project;