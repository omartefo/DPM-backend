const express = require('express');
const router = express.Router();
const tenderControler = require('../controllers/tenderController');
const { auth } = require('../middlewares/auth');
const { restrictTo } = require('../middlewares/permissions');

router.route('/:id/bids').get(auth, tenderControler.tenderBids);
router.route('/:id/awardTender').patch(auth, restrictTo('Super_Admin', 'Admin'), tenderControler.awardTender);
router.route('/:id/unAwardTender').patch(auth, restrictTo('Super_Admin', 'Admin'), tenderControler.unAwardTender);
router.route('/:id/changeStatus').patch(auth, restrictTo('Super_Admin'), tenderControler.changeTenderStatus);

router.route('/')
	.get(auth, tenderControler.getAllTenders)
	.post(auth, restrictTo('Super_Admin', 'Admin'), tenderControler.uploadDocs, tenderControler.createTender);

router.use(auth);

router.route('/:id')
	.get(tenderControler.getTender)
	.patch(restrictTo('Super_Admin', 'Admin'), tenderControler.updateTender)
	.delete(restrictTo('Super_Admin', 'Admin'), tenderControler.deleteTender)

module.exports = router;