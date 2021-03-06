const express = require('express')
const router = express.Router()

const checkAuth = require('../middlewares/check-auth')
const ProfileController = require('../controllers/profile')

router.get('/view/:userId', ProfileController.profile_view)
router.post('/view_self', checkAuth, ProfileController.profile_view_self)
router.patch('/update/:userId', checkAuth, ProfileController.profile_update)
router.patch(
  '/update/profession/:userId',
  checkAuth,
  ProfileController.profile_update_profession
)
router.patch(
  '/update/genre/:userId',
  checkAuth,
  ProfileController.profile_update_genre
)

module.exports = router
