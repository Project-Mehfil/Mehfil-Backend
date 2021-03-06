const mongoose = require('mongoose')
const cloudinary = require('./cloudinary')
const User = require('../models/user')
const VerificationForm = require('../models/verificationForm')
const { use } = require('passport')

exports.check_verification = (req, res, next) => {
  VerificationForm.find({
    user_id: req.params.userId
  })
    .exec()
    .then(forms => {
      forms.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      let requiredData = forms[0]
      console.log(requiredData)
      if (requiredData != null) {
        res.status(200).json({
          last_form_status: requiredData.status
        })
      } else {
        res.status(200).json({
          last_form_status: 'NEW'
        })
      }
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        message: 'there was an error in fetching user profile',
        error: err
      })
    })
}

exports.update_verification = (req, res, next) => {
  let status = req.body.status
  let updates = {}
  let fromUpdates = {
    status: status
  }

  if (status == 'ACCEPTED') {
    updates = {
      is_verified: true
    }
  } else if (status == 'REJECTED') {
    updates = {
      is_verified: false
    }
  } else {
    res.status(404).json({
      message: 'Status value is invalid'
    })
  }

  VerificationForm.findByIdAndUpdate(
    req.params.fromId,
    { $set: fromUpdates },
    { new: true }
  )
    .exec()
    .then(form => {
      console.log(form)
      User.findByIdAndUpdate(
        { _id: form.user_id },
        { $set: updates },
        { new: true }
      )
        .exec()
        .then(user => {
          console.log(user)
          res.status(200).json({
            _id: user._id,
            last_from_status: form.status,
            is_verified: user.is_verified
          })
        })
        .catch(err => {
          console.log(err)
          res.status(500).json({
            message: 'there was an error in updating user details',
            error: err
          })
        })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        message: 'there was an error in updating user details',
        error: err
      })
    })
}

exports.allUsers = (req, res, next) => {
  VerificationForm.find({})
    .exec()
    .then(users => {
      res.status(200).json({ data: users })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        message: 'Something went wrong',
        error: err
      })
    })
}

exports.addVerificationForm = (req, res, next) => {
  User.find({ _id: req.params.userId })
    .lean()
    .exec()
    .then((result, err) => {
      if (result) {
        let userid = result[0]['_id']
        let email = result[0]['email']
        let forms = result[0]['verification_forms']
        let firstName = result[0]['name']['firstName']
        let lastName = result[0]['name']['lastName']
        let profilePic = result[0]['profile_pic']

        form = new VerificationForm({
          _id: new mongoose.Types.ObjectId(),
          user_id: userid,
          created_at: Date.now(),
          name: {
            firstName: firstName,
            lastName: lastName
          },
          profile_pic: profilePic,
          email: email,
          status: 'PENDING',
          facebook: req.body.facebook,
          instagram: req.body.instagram,
          work_link: req.body.work_link
        })

        forms.push(form._id)

        form
          .save()
          .then(form => {
            console.log(form)

            updates = {
              verification_forms: forms,
              is_verified: false
            }

            console.log(updates)

            User.findOneAndUpdate(
              { _id: userid },
              { $set: updates },
              { new: true }
            )
              .exec()
              .then(user => {
                console.log(user)

                res.status(201).json({
                  message: 'Created form',
                  from: {
                    _id: form._id,
                    user_id: form.user_id,
                    created_at: form.created_at,
                    email: form.email,
                    status: form.status,
                    facebook: form.facebook,
                    instagram: form.instagram,
                    work_link: form.work_link
                  }
                })
              })
              .catch(err => {
                console.log(err)
                res.status(500).json({
                  message: 'Failed to create post',
                  error: err
                })
              })
          })
          .catch(err => {
            console.log(err)
            res.status(500).json({
              message: 'Failed to create post',
              error: err
            })
          })
      } else {
        console.log('error' + err)
        res.send(err)
      }
    })
}

exports.verificationForm = (req, res, next) => {
  VerificationForm.find({ _id: req.params.formId })
    .exec()
    .then(form => {
      res.status(200).json({
        data: form
      })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        message: 'there was an error in fetching user profile',
        error: err
      })
    })
}

exports.upload_file = async (req, res, next) => {
  const formId = req.params.formId
  const { path } = req.file
  let uploadedObject = {}
  try {
    uploadedObject = await cloudinary.uploads(path, 'Verifications')
    console.log('cloudinary link : ' + uploadedObject)
  } catch (e) {
    VerificationForm.findByIdAndDelete(formId)
      .exec()
      .then(result => {
        console.log(result)
        res.status(400).json({
          message: 'upload failed, post deleted'
        })
      })
      .catch(err => {
        console.log(err)
        res.status(500).json({
          message: 'upload failed and failed to delete post',
          error: err
        })
      })
  }

  console.log(uploadedObject)

  let options = {
    verification_photo: uploadedObject.url
  }

  VerificationForm.update({ _id: formId }, options, (err, result) => {
    if (err) {
      VerificationForm.findByIdAndDelete(formId)
        .exec()
        .then(result => {
          console.log(result)
          res.status(400).json({
            message: 'upload failed, post deleted'
          })
        })
        .catch(err => {
          console.log(err)
          res.status(500).json({
            message: 'upload failed and failed to delete post',
            error: err
          })
        })
    } else {
      VerificationForm.findOne({ _id: formId }, (err2, res2) => {
        res.send({ message: 'success' })
      })
    }
  })
}
