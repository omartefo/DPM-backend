const express = require('express');
const compression = require('compression');
const dotEnv = require('dotenv');
const cors = require('cors');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');

const app = express();

dotEnv.config();

app.use(express.json());
app.use(compression());
app.use(cors());

// Routers
const userRouter = require('./routes/userRoutes');
const authRouter = require('./routes/authRoutes');
const projectRouter = require('./routes/projectRoutes');
const tenderRouter = require('./routes/tenderRoutes');
const bidsRouter = require('./routes/biddingRoutes');
const notificationRouter = require('./routes/notificationRoutes');
const downloadsRouter = require('./routes/downloadCenterRoutes');
const otpCodeRouter = require('./routes/otpRoutes.js');

app.get('/', (req, res) => {
	res.status(200).send('Welcome to Doha Project Management(DPM) backend.');
});

// API endPoints
app.use('/users', userRouter);
app.use('/auth', authRouter);
app.use('/projects', projectRouter);
app.use('/tenders', tenderRouter);
app.use('/bids', bidsRouter);
app.use('/notifications', notificationRouter);
app.use('/downloads', downloadsRouter);
app.use('/otpCodes', otpCodeRouter);

// Handling unhandled routes
app.all('*', (req, res, next) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
