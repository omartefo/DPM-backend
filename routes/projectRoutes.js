const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { restrictTo } = require('../middlewares/permissions');
const { auth } = require('../middlewares/auth');
const constants = require('../utils/constants');

router.use(
	auth, 
	restrictTo(constants.userTypes.CLIENT, constants.userTypes.SUPER_ADMIN, constants.userTypes.ADMIN, constants.userTypes.EMPLOYEE)
);

router.route('/approve/:id')
	.patch(projectController.approveProject);

router.route('/')
	.get(projectController.getAllProjects)
	.post(projectController.createProject);

router.route('/:id')
	.get(projectController.getProject)
	.patch(projectController.updateProject)
	.delete(projectController.deleteProject)

module.exports = router;