// 3rd party packages
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

// Models
const { User, validate } = require('../models/userModel');
const { UserCompany } = require('../models/userCompanyModel');
const { Bidding } = require('../models/biddingModel');

// Utils
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { sendEmail } = require('../utils/helpers');
const constants = require('../utils/constants');
const { Project } = require('../models/projectsModel');
const { UserNotification } = require('../models/notificationModel');
const { Tender } = require('../models/tenderModel');
const db = require('../db');

prepareWhere = (userType) => {
	let operator = 'eq';
	let where = {};

	// Case1: When query type is an object { 'ne': 'Admin' }
	if (typeof userType === 'object') {
		operator = Object.keys(userType);
		where['type'] = {
			[Op[operator]]: userType[operator]
		};

		if (userType[operator].split(',').length > 1) {
			where['type'] = {
				[Op.notIn]: userType[operator].split(',')
			};
		}
	}
	else {
		// Case2: If user types are multiple for example ['Super_Admin', 'Admin', 'Employee']
		if (userType.split(',').length > 1) {
			where['type'] = {
				[Op['in']]: userType.split(',')
			};
		}
		else {
			where.type = userType;
		}
	}

	return where;
}

exports.getAllUsers = async (req, res, next) => {
	const page = +req.query.page || 1;
	const limit = req.query.limit === 'all' ? null : +req.query.limit || 10;
	const userType = req.query.type;
	const mobileNumber = req.query.mobileNumber;

	let where = {};
	if (userType) {
		where = prepareWhere(userType);
	}

	if (mobileNumber) {
		where.mobileNumber = {
			[Op.like]: '%' + mobileNumber + '%'
		}
	}

	let offset = null;
	if (limit) {
		offset = (page - 1) * limit;
	}
	
	const users = await User.findAndCountAll({
		attributes: {
			exclude: ['password', 'confirmationCode', 'passwordResetToken', 'passwordResetExpires'],
		},
		where,
		limit,
		offset,
		include: [
			{ 
				model: UserCompany,
				attributes: ['companyId', 'name'],
				required: false 
			}
		]
	});

	res.status(200).json({
		status: 'success',
		data: {
			users
		}
	});
};

exports.me = catchAsync(async (req, res, next) => {
	const userId = req.user.userId;
	const user = await User.findByPk(userId, { attributes: ['userId', 'name', 'email', 'mobileNumber', 'type', 'canParticipateInTenders' ] });

	if (!user) return next(new AppError('No record found with given Id', 404));

	const biddings = await Bidding.findAll({ where: { userId }, attributes: ['biddingId', 'tenderId', 'status'] });

	user.dataValues.password = undefined;
	user.dataValues.bids = [];
	for (let rec of biddings) {
		user.dataValues.bids.push(rec);
	}

	res.status(200).json({
		status: 'success',
		data: {
			user
		}
	});
});

exports.getUser = catchAsync(async (req, res, next) => {
	const userId = req.params.id;
	const user = await User.findByPk(userId, {
		attributes: {
			exclude: ['password', 'confirmationCode', 'passwordResetToken', 'passwordResetExpires'],
		},
		include: [
			{ 
				model: UserCompany,
				attributes: ['companyId', 'name', 'commercialRegNumber', 'address', 'totalEmployees'],
				required: false 
			}
		]
	});

	if (!user) return next(new AppError('No record found with given Id', 404));

	res.status(200).json({
		status: 'success',
		data: {
			user
		}
	});
});

exports.createUser = catchAsync(async (req, res, next) => {
	const userType = req.body.type;

	if (userType === constants.userTypes.CLIENT) {
		const { error } = validate(req.body);
		if (error) return next(new AppError(error.message, 400));
	}
	else if ([constants.userTypes.ADMIN, constants.userTypes.EMPLOYEE].includes(userType)) {
		const { error } = validateAdmin(req.body);
		if (error) return next(new AppError(error.message, 400));
	}
	else
	{
		const { error } = validateNonClientUser(req.body);
		if (error) return next(new AppError(error.message, 400));
	}

	// Start transaction
	const transaction = await db.transaction();

	try {
		const token = jwt.sign({ email: req.body.email }, process.env.JWT_PRIVATE_KEY);

		const { name, email, mobileNumber, password, type, isAdmin } = req.body;

		const salt = await bcrypt.genSalt(10);
		const encryptedPassword = await bcrypt.hash(password, salt);
		let company;

		if ([constants.userTypes.CONSULTANT, constants.userTypes.SUPPLIER, constants.userTypes.CONTRACTOR].includes(type))
		{
			const { companyName, commercialRegNumber, address, totalEmployees, isVerifiedOnBinaa } = req.body;
			const company = {
				name: companyName,
				commercialRegNumber,
				address,
				totalEmployees,
				isVerifiedOnBinaa
			};

			company = await UserCompany.create(company, { transaction });
		}

		const userData = { 
			name,
			email,
			mobileNumber,
			isAdmin: isAdmin || false,
			password: encryptedPassword, 
			type,
			confirmationCode: token,
			companyId: company?.companyId || null
		};

		const user = await User.create(userData, { transaction });

		// Don't need email verification incase admin add user;
		if (req.body.fromAdmin) {
			user.isAccountActive = true;
			user.isEmailVerified = true;
			await user.save({ transaction });
		}
		else {
			await sendVerifyAccountEmail(token, user);
		}

		await transaction.commit();
		
		res.status(201).json({
			status: 'success',
			data: user.userId,
			message: 'User was registered successfully! Please check your email'
		});
	} catch (err) {
		await transaction.rollback();
		throw err; // Let catchAsync handle it
	}
});

exports.updateUser = catchAsync(async (req, res, next) => {
	const userId = +req.params.id;

	const user = await User.findByPk(userId, {
		attributes: ['userId', 'companyId']
	});

	if (!user) return next(new AppError('No record found with given Id', 404));

	const transaction = await db.transaction();

	try {
		const { name, email, mobileNumber, type, companyId, isAccountActive } = req.body;
		const userInfoToUpdate = {
			name,
			email,
			mobileNumber,
			type,
			isAccountActive,
			companyId
		};
		await User.update(userInfoToUpdate, { 
			where: { userId },
			transaction
		});

		const userWhoCanHaveCompany = [
			constants.userTypes.CONSULTANT,
			constants.userTypes.SUPPLIER,
			constants.userTypes.CONTRACTOR
		];
	
		if (userWhoCanHaveCompany.includes(type)) {
			const { companyName, commercialRegNumber, address, totalEmployees, isVerifiedOnBinaa } = req.body;
			const companyInfo = {
				name: companyName,
				commercialRegNumber, 
				address,
				totalEmployees,
				isVerifiedOnBinaa
			};
	
			if (user.companyId) {
				await UserCompany.update(companyInfo, 
					{ where: { companyId: user.companyId },
					transaction
				});
			}
			else {
				const company = await UserCompany.create(companyInfo, { transaction });
				user.companyId = company.companyId;
				await user.save({ transaction });
			}
		}
	
		await transaction.commit();

		res.status(200).json({
			status: 'success',
			data: {
				user
			}
		});
	} catch(error) {
		await transaction.rollback();
		throw err; // Let catchAsync handle it
	}
});

exports.deleteUser = catchAsync(async (req, res, next) => {
	const userId = +req.params.id;
	const userToDelete = await User.findByPk(userId, { attributes: ['userId', 'type'] });

	if (!userToDelete) {
		throw new AppError('No record found with given Id', 404);
	}

	const transaction = await db.transaction();

	try {
		// If user is a Client, delete all projects
		if (userToDelete.type === constants.userTypes.CLIENT) {
			await Project.destroy({ where: { clientId: userId }, transaction });
		}

		// Check if user to delete is awarded with a tender;
		const isUserAwarded = await Tender.findOne({ 
			where: { awardedTo: userId },
			transaction
		});

		if (isUserAwarded) {
			await transaction.rollback();
			throw new AppError('Cannot delete user: User is awarded in tenders.', 400);
		}

		// If user is Consultant, Contractor, or Supplier, delete biddings & notifications
		const usersWhoCanBid = [
			constants.userTypes.CONSULTANT,
			constants.userTypes.CONTRACTOR,
			constants.userTypes.SUPPLIER
		];

		if (usersWhoCanBid.includes(userToDelete.type)) {
			await Bidding.destroy({ where: { userId }, transaction });
			await UserNotification.destroy({ where: { userId }, transaction });
		}

		await User.destroy({ where: { userId }, transaction });

		await transaction.commit();

		res.status(204).json({
			status: 'success',
			data: {
					userToDelete
			}
		});
	}
	catch(error) {
		await transaction.rollback();
		throw err; // Let catchAsync handle it
	}
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    const { newPassword } = req.body;
    if (!newPassword) {
        return next(new AppError('New password is required.', 404));
    }

    const userId = req.params.id;
	const user = await User.findByPk(userId, { attributes: ['userId', 'password'] });

	if (!user) return next(new AppError('No record found with given Id', 404));

    const salt = await bcrypt.genSalt(10);
	const encryptedNewPassword = await bcrypt.hash(newPassword, salt);

    user.password = encryptedNewPassword;
    await user.save();

	res.status(200).json({
		status: 'success',
		data: {
			user
		}
	});
});

exports.toggleTenderParticipation = catchAsync(async (req, res, next) => {
	const canParticipateInTenders = req.body.canParticipateInTenders;
    const userId = +req.params.id;

	const user = await User.findByPk(userId, {
		attributes: ['userId', 'companyId']
	});
	if (!user) return next(new AppError('No record found with given Id', 404));

	await User.update({ canParticipateInTenders }, { where: { userId }});

	res.status(200).json({
		status: 'success',
		data: {
			canParticipateInTenders
		}
	});
});

exports.verifyUser = catchAsync(async(req, res, next) => {
	const confirmationCode = req.params.confirmationCode;
	let user = await User.findOne({ where: { confirmationCode }});

	if (!user) return next(new AppError('User not found', 404));

	// Supplier and Contractor gets active when admin approve it, other users account get active as their email is verified;
	if ( [constants.userTypes.EMPLOYEE, constants.userTypes.CONTRACTOR].includes(user.dataValues.type)) {
		user.isEmailVerified = true;
	}
	else {
		user.isEmailVerified = true;
		user.isAccountActive = true;
	}

	await user.save();

	res.status(200).json({
		status: 'success',
		data: {
			message: "Account verified"
		}
	});
});

exports.sendEmailToUser = catchAsync( async(req, res, next) => {
	const { error } = validateEmailRequest(req.body);
	if (error) return next(new AppError(error.message, 400));

	const { subject, message, name, email } = req.body;

	const messageWithUserInfo = `
		<p>
			This is email initiated by ${name} with email ${email} with following query.<br><br>
			"${message}"
		</p>
		`;

	const options = {
		email: process.env.DOHA_HELP_DESK_EMAIL,
		subject,
		html: messageWithUserInfo
	};

	await sendEmail(options);

	res.status(200).json({
		status: 'success',
		message: 'Email sent'
	});
});

validateNonClientUser = (user) => {
	const schema = Joi.object({
		name: Joi.string().required().min(3),
		email: Joi.string().required().email(),
		mobileNumber: Joi.string().required().min(constants.userConfig.MOBILE_NUMBER_LENGTH).max(constants.userConfig.MOBILE_NUMBER_LENGTH),
		password: Joi.string().required().min(8),
		type: Joi.string().required().valid(constants.userTypes.CONSULTANT, constants.userTypes.SUPPLIER, constants.userTypes.CONTRACTOR),

		// User Company Info
		companyName: Joi.string().required(),
		commercialRegNumber: Joi.string().required(),
		address: Joi.string().required(),
		totalEmployees: Joi.number().required(),
		documents: Joi.string().allow(''),

		fromAdmin: Joi.boolean().default(false)
	});

	return schema.validate(user);
}

validateAdmin = (user) => {
	const schema = Joi.object({
		name: Joi.string().required().min(3),
		email: Joi.string().required().email(),
		mobileNumber: Joi.string().required().min(constants.userConfig.MOBILE_NUMBER_LENGTH).max(constants.userConfig.MOBILE_NUMBER_LENGTH),
		type: Joi.string().required().valid(constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN, constants.userTypes.EMPLOYEE),
		password: Joi.string().required().min(8),
		fromAdmin: Joi.boolean().default(false),
	});

	return schema.validate(user);
}

validateEmailRequest = (emailOptions) => {
	const schema = Joi.object({
		name: Joi.string().required(),
		email: Joi.string().required().email(),
		phoneNumber: Joi.string().required(),
		message: Joi.string().required(),
		subject: Joi.string().required()
	});

	return schema.validate(emailOptions);
}

sendVerifyAccountEmail = async (token, user) => {
	const baseUrl = process.env.BASE_URL || 'http://localhost:4200';
	const redirectUrl = `${baseUrl}/confirm/${token}`;

	const emailOptions = {
		email: user.email,
		subject: 'Please confirm your account',
		html:  `<h1>Email Confirmation</h1>
			<h2>Hi, ${user.name}</h2>
			<p>Thank you for registering with Doha Project Management(DPM). Please confirm your email by clicking on the following link</p>
			<a href=${redirectUrl}> Click here</a>
		</div>`
	};

	await sendEmail(emailOptions);
}