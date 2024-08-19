const Joi = require("joi");

const { OTPCode, validate } = require("../models/otpCodesModel");

const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { generateRandomFourDigits, sendSMS } = require("../utils/helpers");
const { Op } = require("sequelize");

exports.getOTPCode = catchAsync(async(req, res, next) => {
	const countryCode = '+92';
	const { error } = validateMobileNumber(req.body);
	if (error) return next(new AppError(error.message, 400));

	const code = generateRandomFourDigits();
	const text = `${code} is your DPM verification code.`;
	const mobileNumber = `${countryCode}${req.body.mobileNumber}`;

	await sendSMS(mobileNumber, text);
	
	await OTPCode.create({ 
		mobileNumber: req.body.mobileNumber,
		code,
		expiresAt: new Date(Date.now() + 2 * 60 * 1000)
	});

	res.status(200).json({
		status: 'success',
		message: 'SMS sent'
	});
});

exports.verifyOTPCode = catchAsync(async(req, res, next) => {
    const { error } = validate(req.body);
	if (error) return next(new AppError(error.message, 400));

	const { code, mobileNumber } = req.body;
	const dbOTPRecord = await OTPCode.findOne({
		where: {
			mobileNumber,
			code,
			expiresAt: {
				[Op.gte]: Date.now()
			}
		}
	});

	if (!dbOTPRecord || code != dbOTPRecord.code) {
		return next(new AppError('Invalid OTP code.', 400));
	}
	
	dbOTPRecord.code = null;
	await dbOTPRecord.save();

	res.status(200).json({
		status: 'success',
		message: 'OTP code is verified'
	});
});

validateMobileNumber = (mobNumber) => {
	const schema = Joi.object({
		mobileNumber: Joi.string().required().min(10).max(10)
	});

	return schema.validate(mobNumber);
}