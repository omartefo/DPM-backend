// 3rd party packages
const { Op } = require('sequelize');

// Models
const { Project, validate } = require('../models/projectsModel');
const { Tender } = require('../models/tenderModel');
const { User } = require('../models/userModel');

// Utils
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const constants = require('../utils/constants');

exports.getAllProjects = catchAsync(async (req, res, next) => {
	const { type, userId } = req.user;
	const search = req.query;
	const where = {};

	const page = +req.query.page || 1;
	const limit = req.query.limit === 'all' ? null : +req.query.limit || 10;

	for (let key in search) {
		if (key === 'page' || key === 'limit') continue;

		if (key === 'name') {
			where.name = {
				[Op.like]: '%' + search['name'] + '%'
			}
		}

		else if (key === 'isApproved') {
			where.isApproved = (search['isApproved'] === 'true');
		}
	}

	// Project is always associated with a client, no project without a client;
	if (type === constants.userTypes.CLIENT) {		
		where.clientId = userId;
	}

	let offset = null;
	if (limit) {
		offset = (page - 1) * limit;
	}

	const projects = await Project.findAndCountAll( {
		where,
		limit,
		offset,
		include: [
			{ 
				model: User, attributes: ['name', 'mobileNumber'] 
			},
			{
				model: Tender, attributes: ['tenderNumber']
			},
		],
		order: [['createdAt', 'DESC']],
	});

	res.status(200).json({
		status: 'success',
		data: {
			projects
		}
	});
});

exports.getProject = catchAsync(async (req, res, next) => {
	const projectId = req.params.id;
	const project = await Project.findByPk(projectId);

	if (!project) return next(new AppError('No record found with given Id', 404));

	res.status(200).json({
		status: 'success',
		data: {
			project
		}
	});
});

exports.createProject = catchAsync(async (req, res, next) => {
	const { type: userType } = req.user;

	if (![constants.userTypes.CLIENT, constants.userTypes.SUPER_ADMIN].includes(userType)) {
		return next(new AppError("You don't have the permission to create project.", 403));
	}

	const { error } = validate(req.body);
	if (error) return next(new AppError(error.message, 400));

	projectImages = [
		"https://toptender.qa/toptender/public/images/works/991628583206.jpg", 
		"https://toptender.qa/toptender/public/images/works/211628583166.jpg",
		"https://toptender.qa/toptender/public/images/works/541628582653.jpg",
		"https://toptender.qa/toptender/public/images/works/791628583231.jpg"
	];

	const { name, location, description, type, clientId } = req.body;

	const project = await Project.create({ 
		name, 
		location, 
		image: projectImages[Math.floor(Math.random() * projectImages.length)],
		description,
		type,
		clientId
	});

	if (userType === constants.userTypes.SUPER_ADMIN) {
		project.isApproved = true;
		await project.save();
	}
	
	res.status(201).json({
		status: 'success',
		data: {
			project
		}
	});
});

exports.updateProject = catchAsync(async (req, res, next) => {
	const projectId = req.params.id;
	const project = await Project.update(req.body, { where: { projectId }});

	if (!project) return next(new AppError('No record found with given Id', 404));

	res.status(200).json({
		status: 'success',
		data: {
			project
		}
	});
});

exports.deleteProject = catchAsync(async (req, res, next) => {
	const projectId = req.params.id;
	const project = await Project.destroy({ where: { projectId }});

	if (!project) return next(new AppError('No record found with given Id', 404));

	res.status(204).json({
		status: 'success',
		data: {
			project
		}
	});
});

exports.approveProject = catchAsync(async (req, res, next) => {
	const { type: userType } = req.user;

	const adminUsers = [constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN, constants.userTypes.EMPLOYEE];
	if (!adminUsers.includes(userType)) return next(new AppError("You don't have the permission to approve project."), 403);

	const projectId = req.params.id;
	const project = await Project.findByPk(projectId);

	if (!project) return next(new AppError('No record found with given Id', 404));

	project.isApproved = true;
	await project.save();

	res.status(200).json({
		status: 'success',
		data: {
			project
		}
	});
});