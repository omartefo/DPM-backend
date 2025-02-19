const superAgent = require('superagent');
const { SendMailClient }  = require('zeptomail');
const constants = require('./constants');

exports.generateRandomFourDigits = () => {
	return Math.floor(1000 + Math.random() * 9000);
}

exports.sendSMS = async (number, text) => {
	const payload = JSON.stringify({
		to: number,
		body: text
	});

	return await superAgent.post(process.env.BULK_SMS_API_BASE_URL)
		.send(payload)
		.set('Content-Type', 'application/json')
		.set('Authorization', `Basic ${process.env.BULK_SMS_TOKEN}`);
}

exports.sendEmail = async (options) => {
	const url = process.env.ZOHO_API_URL;
	const token = process.env.ZOHO_API_TOKEN;
	const mailFrom = process.env.EMAIL_USER;

    const { email: emailTo, subject, html } = options;

	let client = new SendMailClient({url, token});

	await client.sendMail({
		"from": 
		{
			"address": mailFrom,
			"name": "noreply"
		},
		"to": 
		[
			{
			"email_address": 
				{
					"address": emailTo,
					"name": "Doha Project Management"
				}
			}
		],
		"subject": subject,
		"htmlbody": html,
	});
};

exports.getBiddingStatus = (tenderMinPrice, tenderMaxPrice, userPrice) => {
	let status = constants.biddingStatuses.OUT_OF_RANGE;
	
	if (userPrice >= tenderMinPrice && userPrice <= tenderMaxPrice) {
		status = constants.biddingStatuses.IN_RANGE;
	}

	return status;
}