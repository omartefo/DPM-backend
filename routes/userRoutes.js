const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/permissions');
const constants = require('../utils/constants');

router.route('/sendEmail').post(userController.sendEmailToUser);
router.route('/verify/:confirmationCode').get(userController.verifyUser);
router.route('/').post(userController.createUser);

router.use(auth);

router.route('/me').get(userController.me);
router.route('/')
	.get(
		restrictTo(constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN, constants.userTypes.EMPLOYEE), 
		userController.getAllUsers
	)

router.route('/:id')
	.get(userController.getUser)
	.patch(userController.updateUser)
	.delete(userController.deleteUser)

module.exports = router;