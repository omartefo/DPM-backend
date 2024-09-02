const superAgent = require('superagent');
const nodeMailer = require('nodemailer');

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
	try {
		console.log(process.env.EMAIL_USER, process.env.EMAIL_PASSWORD);
		console.log('options =', options);

		// Create a transporter. It is a service that will actually send email.
		const transporter = nodeMailer.createTransport({
			host: process.env.EMAIL_HOST,
			secure: true,
			port: 465,
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASSWORD
			}
		});

		// Define the email options
		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: options.email,
			subject: options.subject,
			html: options.html
		};

		// Send the email
		await transporter.sendMail(mailOptions);
	}
	catch (error) {
		console.log('Error while sending emaile...', error);
		throw error;
	}
};