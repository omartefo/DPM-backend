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
const { generateRandomFourDigits, sendSMS, sendEmail } = require('../utils/helpers');

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
	const limit = +req.query.limit || 10;
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

	// Don't query logged in user data
	where.email = { [Op.ne]: req.user.email };

	const offset = (page - 1) * limit;
	
	const users = await User.findAndCountAll({
		where,
		limit,
		offset,
		include: [{ model: UserCompany, required: false }]});

	res.status(200).json({
		status: 'success',
		data: {
			users
		}
	});
};

exports.me = catchAsync(async (req, res, next) => {
	const userId = req.user.userId;
	const user = await User.findByPk(userId, { attributes: ['userId', 'name', 'email', 'mobileNumber', 'type' ] });

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
	const user = await User.findByPk(userId);

	if (!user) return next(new AppError('No record found with given Id', 404));

	res.status(200).json({
		status: 'success',
		data: {
			user
		}
	});
});

exports.createUser = catchAsync(async (req, res, next) => {
	validateRequestData(req, next);

	const token = jwt.sign({ email: req.body.email }, process.env.JWT_PRIVATE_KEY);

	const { name, email, mobileNumber, password, type, isAdmin } = req.body;

	const salt = await bcrypt.genSalt(10);
	const encryptedPassword = await bcrypt.hash(password, salt);

	const user = await User.create({ 
		name, email, mobileNumber,
		isAdmin: isAdmin || false,
		password: encryptedPassword, 
		type, confirmationCode: token 
	});

	if (['Consultant', 'Supplier', 'Contractor'].includes(type)) {
		const { companyName, commercialRegNumber, address, totalEmployees } = req.body;

		const company = await UserCompany.create({
			name: companyName, commercialRegNumber, address, totalEmployees
		});

		user.companyId = company.dataValues.companyId;

		await user.save();
	}

	// Don't need email verification incase admin add user;
	if (req.body.fromAdmin) {
		user.isAccountActive = true;
		user.isEmailVerified = true;
		await user.save();
	}
	else {
		await sendVerifyAccountEmail(token, user);
	}
	
	res.status(201).json({
		status: 'success',
		data: user.userId,
		message: 'User was registered successfully! Please check your email'
	});
});

exports.createSuperAdmin = catchAsync(async (req, res, next) => {
	const { error } = validateAdmin(req.body);
	if (error) return next(new AppError(error.message, 400));

	const { name, email, mobileNumber, password } = req.body;

	const salt = await bcrypt.genSalt(10);
	const encryptedPassword = await bcrypt.hash(password, salt);

	const user = await User.create({ 
		name, 
		email, 
		mobileNumber, 
		password: encryptedPassword,
		type: 'Super_Admin',
		isAccountActive: true,
		isEmailVerified: true
	});
	
	res.status(201).json({
		status: 'success',
		data: {
			user
		}
	});
});

exports.updateUser = catchAsync(async (req, res, next) => {
	const userId = req.params.id;
	const user = await User.update(req.body, { where: { userId }});

	if (!user) return next(new AppError('No record found with given Id', 404));

	res.status(200).json({
		status: 'success',
		data: {
			user
		}
	});
});

exports.deleteUser = catchAsync(async (req, res, next) => {
	const userId = req.params.id;
	const user = await User.destroy({ where: { userId }});

	if (!user) return next(new AppError('No record found with given Id', 404));

	res.status(204).json({
		status: 'success',
		data: {
			user
		}
	});
});

exports.verifyUser = catchAsync(async(req, res, next) => {
	const confirmationCode = req.params.confirmationCode;
	let user = await User.findOne({ where: { confirmationCode }});

	if (!user) return next(new AppError('User not found', 404));

	// Supplier and Contractor gets active when admin approve it, other users account get active as their email is verified;
	if (user.dataValues.type === 'Supplier' || user.dataValues.type === 'Contractor') {
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

exports.mobileOTPVerification = catchAsync(async(req, res, next) => {
	const { error } = validateMobileNumber(req.body);
	if (error) return next(new AppError(error.message, 400));

	const verificationCode = generateRandomFourDigits();
	const text = `Your DPM Verification code is:\n${verificationCode}`;
	const mobileNumber = '+974' + req.body.mobileNumber;

	const output = await sendSMS(mobileNumber, text);

	res.status(200).json({
		status: 'success',
		data: {
			code: verificationCode,
			text: JSON.parse(output.text)
		}
	});
});

exports.sendEmailToUser = catchAsync( async(req, res, next) => {
	const { subject, message, name, email } = req.body;

	const messageWithUserInfo = `
		<p>
			This is email initiated by ${name} with email ${email} with following query.<br><br>
			"${message}"
		</p>
		`;

	const options = {
		email: 'info@dpm.qa',
		subject,
		html: messageWithUserInfo
	};

	const emailResp = await sendEmail(options);

	res.status(200).json({
		status: 'success',
		data: {
			emailResp
		}
	});
});

validateRequestData = (req, next) => {
	if (req.body.type === 'Client') {
		const { error } = validate(req.body);
		if (error) return next(new AppError(error.message, 400));
	}
	else if (['Admin', 'Employee'].includes(req.body.type)) {
		const { error } = validateAdmin(req.body);
		if (error) return next(new AppError(error.message, 400));
	}
	else
	{
		const { error } = validateNonClientUser(req.body);
		if (error) return next(new AppError(error.message, 400));
	}
}

validateMobileNumber = (mobNumber) => {
	const schema = Joi.object({
		mobileNumber: Joi.string().required().min(8).max(8)
	});

	return schema.validate(mobNumber);
}

validateNonClientUser = (user) => {
	const schema = Joi.object({
		name: Joi.string().required().min(3),
		email: Joi.string().required().email(),
		mobileNumber: Joi.string().required().min(8).max(8),
		password: Joi.string().required().min(8),
		type: Joi.string().required().valid('Supplier', 'Contractor', 'Consultant'),

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
		mobileNumber: Joi.string().required().min(8).max(8),
		type: Joi.string().required().valid('Super_Admin', 'Admin', 'Employee'),
		password: Joi.string().required().min(8),
		fromAdmin: Joi.boolean().default(false),
	});

	return schema.validate(user);
}

sendVerifyAccountEmail = async (token, user) => {
	let redirectUrl = `http://localhost:4200/confirm/${token}`;

	if (process.env.NODE_ENV === 'production') {
		redirectUrl = `https://dpm.herokuapp.com/confirm/${token}`;
	}
	
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