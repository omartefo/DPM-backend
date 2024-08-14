const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { restrictTo } = require('../middlewares/permissions');
const { auth } = require('../middlewares/auth');

router.use(auth, restrictTo('Client', 'Super_Admin', 'Admin', 'Employee'));

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