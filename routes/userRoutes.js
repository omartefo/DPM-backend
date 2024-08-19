const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/permissions');

router.route('/otpVerification').post(userController.mobileOTPVerification);
router.route('/sendEmail').post(userController.sendEmailToUser);
router.route('/me').get(auth, userController.me);

router.route('/')
	.get(auth, restrictTo('Super_Admin', 'Admin', 'Employee'), userController.getAllUsers)
	.post(userController.createUser);

router.route('/:id')
	.get(userController.getUser)
	.patch(userController.updateUser)
	.delete(userController.deleteUser)

router.route('/verify/:confirmationCode').get(userController.verifyUser);

module.exports = router;