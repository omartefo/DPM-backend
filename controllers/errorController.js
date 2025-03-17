const sendErrorDev = (err, res) => {
	res.status(err.statusCode).json({
		status: err.status,
		message: err.message,
		err: err,
		stack: err.stack
	});
}

const sendErrorProd = (err, res) => {
	let errorMessage = err.message || err.error.message || 'Something went wrong, please contact support';
	const errorCode = err.name || err.error.code;

	if (errorCode) {
		switch(errorCode) {
			case 'SequelizeUniqueConstraintError':
				const field = Object.entries(err.fields);
				errorMessage = `${field[0][0]} already exists`;
				break;

			case 'JsonWebTokenError':
				err.statusCode = 401;
				errorMessage = 'Invalid token. Please log in again';
				break;

			case 'TokenExpiredError':
				err.statusCode = 401;
				errorMessage = 'Your token is expired. Please log in again';
				break;

			case 'TM_5001':
				err.statusCode = 500;
				errorMessage = `Zoho, ${errorMessage}`;
				break;
		}
	}

	res.status(err.statusCode).json({
		status: err.status,
		message: errorMessage,
	});
}

module.exports = (err, req, res, next) => {	
	err.statusCode = err.statusCode || 500;
	err.status = err.status || 'error';

	if (process.env.NODE_ENV === 'development') {
		sendErrorDev(err, res);
	}
	else if (process.env.NODE_ENV === 'production') {
		sendErrorProd(err, res);
	}
}