// 3rd party packages
const bcrypt = require('bcrypt');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const crypto = require("crypto");

// Models
const { User } = require('../models/userModel');

// Utils
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { sendEmail } = require('../utils/helpers');
const constants = require('../utils/constants');

exports.login = catchAsync(async (req, res, next) => {
	const { error } = validate(req.body);
	if (error) return next(new AppError(error.message, 400));

	let user = await User.findOne({
		attributes: ['userId', 'name', 'email', 'password', 'type', 'isAccountActive', 'isEmailVerified'],
		where: { email: req.body.email, type: req.body.type }
	});
	
	if (!user) return next(new AppError('Invalid email or password.', 400));

	// Check if user account is active
	if (!user.isAccountActive || !user.isEmailVerified) return next(new AppError('User account is not active', 400));

	const isValid = await bcrypt.compare(req.body.password, user.password);
	if (!isValid) return next(new AppError('Invalid email or password.', 400));

	const token = generateToken(user);

	res.status(200).json({
		status: 'success',
		access_token: token
	});
});

exports.adminLogin = catchAsync(async (req, res, next) => {
	const { error } = validate(req.body);
	if (error) return next(new AppError(error.message, 400));

	let user = await User.findOne({
		attributes: ['userId', 'name', 'email', 'password', 'type', 'isAccountActive', 'isEmailVerified'],
		where: {
			email: req.body.email,
			[Op.or]: [
				{ type: constants.userTypes.SUPER_ADMIN }, { type: constants.userTypes.ADMIN }, { type: constants.userTypes.EMPLOYEE }
			],
		}
	});

	if (!user) return next(new AppError('Invalid email or password.', 400));

	const isValid = await bcrypt.compare(req.body.password, user.password);
	if (!isValid) return next(new AppError('Invalid email or password.', 400));

	// Check if user account is active
	if (!user.isAccountActive || !user.isEmailVerified) return next(new AppError('User account is not active', 400));

	const token = generateToken(user);

	res.status(200).json({
		status: 'success',
		access_token: token
	});
});

exports.forgotPassword = async(req, res, next) => {
	if (!req.body.email) return next(new AppError('Email is required.', 400));

	const user = await User.findOne({ where: { email: req.body.email }});
	if (!user) return next(new AppError('No user found with given email', 404));

	const resetToken = crypto.randomBytes(32).toString('hex');
	user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
	user.passwordResetExpires = Date.now() + (10 * 60 * 1000); 

	let resetURL = `http://localhost:4200/resetPassword/${resetToken}`;

	if (process.env.NODE_ENV === 'production') {
		resetURL = `${process.env.BASE_URL}/resetPassword/${resetToken}`;
	}

	const emailContent = `Forgot Your password? Submit your new password on following url <br> ${resetURL}<br> If you did'nt forgot password, please ignore this email.`;

	const emailOptions = {
		email: user.email,
		subject: 'Reset Password',
		html:  `
			<h2>Hi, ${user.name}</h2>
			<p>${emailContent}</p>
		</div>`
	}
	await sendEmail(emailOptions);
	await user.save();

	res.status(200).json({
		status: 'success',
		message: 'Reset Password token sent to your email. Please verify'
	});
}

exports.resetPassword = async(req, res, next) => {
	// Get User based on the token;
	const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
	const user = await User.findOne({ where: 
		{ 
			passwordResetToken: hashedToken, 
			passwordResetExpires: { [Op['gt']]: Date.now() } 
		}});

	if (!user) return next(new AppError('Token is invalid or expired', 400));

	const salt = await bcrypt.genSalt(10);
	const encryptedPassword = await bcrypt.hash(req.body.password, salt);

	user.password = encryptedPassword;
	user.passwordResetToken = null;
	user.passwordResetExpires = null;

	await user.save();

	res.status(200).json({
		status: 'success',
		message: 'Password Reset Successfully'
	});
}

function validate(req) {
	const schema = Joi.object({
		email: Joi.string().email().required(),
		password: Joi.string().required(),
		type: Joi.string().required()
	});

	return schema.validate(req); 
}

function generateToken(user) {
	const userData = {
		userId: user.userId,
		name: user.name,
		email: user.email,
		type: user.type
	};
  
	const JWTOptions = {
	  expiresIn: process.env.JWT_EXPIRY,
	};
  
	return jwt.sign(userData, process.env.JWT_PRIVATE_KEY, JWTOptions);
  }