const express = require('express')
const router = express.Router()
const multer = require('../middlewares/multer')

const VerificationController = require('../controllers/verification')
const checkAuth = require('../middlewares/check-auth')
router.get(
  '/check/:userId',
  checkAuth,
  VerificationController.check_verification
)
router.patch(
  '/update/:userId',
  checkAuth,
  VerificationController.update_verification
)

router.get('/allusers', checkAuth, VerificationController.allUsers)

module.exports = router