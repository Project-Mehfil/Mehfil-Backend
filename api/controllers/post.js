const mongoose = require('mongoose')
const fs = require('fs')
const VideoLib = require('node-video-lib')
const path = require('path')
var probe = require('probe-image-size')

const Post = require('../models/post')
const Comment = require('../models/comment')
const User = require('../models/user')
const cloudinary = require('./cloudinary')

exports.create_post = (req, res, next) => {
  console.log('user data', req.userData)
  console.log('file', req.file)

  let post
  const imageTypes = /jpeg|jpg|png/
  const videoTypes = /mp4|flv/

  if (req.file == null || req.file == undefined) {
    post = new Post({
      _id: new mongoose.Types.ObjectId(),
      body: req.body.body,
      type: req.body.type,
      category: req.body.category,
      createdAt: Date.now(),
      createdBy: {
        userId: req.body.createdBy.userId,
        name: req.body.createdBy.name
      }
    })

    post
      .save()
      .then(post => {
        console.log(post)
        res.status(201).json({
          message: 'Created post',
          post: {
            _id: post._id,
            body: post.body,
            media: post.media,
            aspectRatio: post.aspectRatio,
            type: post.type,
            createdAt: post.createdAt,
            createdBy: post.createdBy
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
  } else {
    const imageExtType = imageTypes.test(
      path.extname(req.file.path).toLowerCase()
    )
    const videoExtTypes = videoTypes.test(
      path.extname(req.file.path).toLowerCase()
    )

    if (imageExtType) {
      console.log('Image type true')

      probe(fs.createReadStream(req.file.path))
        .then(result => {
          post = new Post({
            _id: new mongoose.Types.ObjectId(),
            body: req.body.body,
            media: req.file.path,
            aspectRatio: result.width / result.height,
            type: 'image',
            createdAt: Date.now(),
            createdBy: {
              userId: req.userData.userId,
              name: req.userData.name
            }
          })
          post
            .save()
            .then(post => {
              console.log(post)
              res.status(201).json({
                message: 'Created post',
                post: {
                  _id: post._id,
                  body: post.body,
                  media: post.media,
                  aspectRatio: post.aspectRatio,
                  type: post.type,
                  createdAt: post.createdAt,
                  createdBy: post.createdBy
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
          res.send(500).json({
            message: 'Could not read image file',
            error: err
          })
        })
    } else if (videoExtTypes) {
      console.log('Video type true')
      fs.open(req.file.path, 'r', function (err, fd) {
        try {
          let movie = VideoLib.MovieParser.parse(fd)
          console.log('movie width:', movie.tracks[0].width)
          console.log('movie width:', movie.tracks[0].height)
          console.log(
            'aspect ratio:',
            movie.tracks[0].width / movie.tracks[0].height
          )
          // Work with movie
          // console.log("movie width:", movie.tracks["VideoTrack"].width)
          // console.log("movie height:", movie.tracks[0].height)
          post = new Post({
            _id: new mongoose.Types.ObjectId(),
            body: req.body.body,
            media: req.file.path,
            aspectRatio: movie.tracks[0].width / movie.tracks[0].height,
            type: 'video',
            createdAt: Date.now(),
            createdBy: {
              userId: req.userData.userId,
              name: req.userData.name
            }
          })

          post
            .save()
            .then(post => {
              console.log(post)
              res.status(201).json({
                message: 'Created post',
                post: {
                  _id: post._id,
                  body: post.body,
                  media: post.media,
                  aspectRatio: post.aspectRatio,
                  type: post.type,
                  createdAt: post.createdAt,
                  createdBy: post.createdBy
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
        } catch (ex) {
          console.error('Error:', ex)
        } finally {
          fs.closeSync(fd)
        }
      })
    }
  }
}

exports.upload_file = async (req, res, next) => {
  const postID = req.params.postId
  const { path } = req.file
  let uploadedObject = {}
  try {
    uploadedObject = await cloudinary.uploads(path, 'Posts')
    console.log('cloudinary link : ' + uploadedObject)
  } catch (e) {
    Post.findByIdAndDelete(postID)
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
    media: uploadedObject.url
  }

  Post.update({ _id: postID }, options, (err, result) => {
    if (err) {
      Post.findByIdAndDelete(postID)
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
      Post.findOne({ _id: postID }, (err2, res2) => {
        console.log('err2 is ' + err2)
        console.log(res2)
        res.send(res2)
      })
    }
  })

  fs.unlink(path, (err, result) => {
    if (err) {
      console.log(err)
    } else {
    }
  })
}

exports.update_post = (req, res, next) => {
  console.log(req.body)
  let updates
  if (req.file == null) {
    updates = {
      body: req.body.body
    }
  } else {
    updates = {
      body: req.body.body,
      media: req.file.path
    }
  }

  Post.findByIdAndUpdate(req.params.postId, { $set: updates }, { new: true })
    .exec()
    .then(post => {
      console.log(post)
      res.status(200).json({
        message: 'post updated',
        post: {
          _id: post._id,
          body: post.body,
          media: post.media,
          type: post.type,
          createdAt: post.createdAt,
          createdBy: post.createdBy
        }
      })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        message: 'failed to update post',
        error: err
      })
    })
}

exports.delete_post = (req, res, next) => {
  Post.findByIdAndDelete(req.params.postId)
    .exec()
    .then(result => {
      console.log(result)
      res.status(200).json({
        message: 'post deleted'
      })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        message: 'failed to delete post',
        error: err
      })
    })
}

exports.get_all_posts = (req, res, next) => {
  console.log('here in get all')
  const customLabels = {
    totalDocs: 'postCount',
    docs: 'posts',
    page: 'currentPage',
    nextPage: 'next',
    prevPage: 'prev',
    pagingCounter: 'slNo'
  }

  const options = {
    page: parseInt(req.query.page, 10) || 1,
    limit: 10,
    sort: { createdAt: -1 },
    customLabels
  }

  Post.paginate({}, options)
    .then(result => {
      return result
    })
    .then(result => {
      //already liked, profile image, nickname
      let resultObj = result['posts']
      let finalResult = []
      Promise.all(
        resultObj.map(async singlePost => {
          var tempost = JSON.parse(JSON.stringify(singlePost))
          var alreadyLiked = false
          tempost.likes.map(singleLike => {
            if (`${singleLike.likedBy}` == req.params.userId) {
              alreadyLiked = true
            } else {
              alreadyLiked = false
            }
          })
          tempost['alreadyLiked'] = alreadyLiked

          var alreadySaved = false
          tempost.saved.map(singleSave => {
            if (`${singleSave.savedBy}` == req.params.userId) {
              alreadySaved = true
            } else {
              alreadySaved = false
            }
          })
          tempost['alreadySaved'] = alreadySaved

          await User.findOne(
            { _id: singlePost.createdBy.userId },
            (err2, res2) => {
              if (err2) {
                console.log('err2 is ' + err2)
                res.status(500).json({
                  message: 'failed reply deleted',
                  error: err2
                })
              } else {
                if (res2 == null) {
                  tempost['profile_pic'] =
                    'https://lh3.googleusercontent.com/a-/AAuE7mBZOJf8xINXnRo1jQYYlIpMdS5CNVlermJMrlazpw=s96-c'
                  tempost['username'] = 'User Deleted'
                } else {
                  tempost['profile_pic'] = res2.profile_pic
                  tempost['username'] = res2.username
                }
              }
            }
          )

          if (tempost.media != null) {
            finalResult.push(tempost)
            console.log('added  :' + tempost.media)
          } else {
            console.log('undefined  :' + tempost.media)
          }
        })
      )
        .then(() => {
          var objFinal = {}
          objFinal['posts'] = finalResult
          objFinal['limit'] = result['limit']
          objFinal['totalPages'] = result['totalPages']
          objFinal['currentPage'] = result['currentPage']
          objFinal['slNo'] = result['slNo']
          objFinal['hasPrevPage'] = result['hasPrevPage']
          objFinal['hasNextPage'] = result['hasNextPage']
          objFinal['postCount'] = result['postCount']
          objFinal['prev'] = result['prev']
          objFinal['next'] = result['next']
          res.status(200).json(objFinal)
        })
        .catch(err => {
          console.log(err)
          res.status(500).json({})
        })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({})
    })
}

exports.get_all_posts2 = (req, res, next) => {
  Post.find()
    .exec()
    .then(post => {
      // res.status(200).json(post)
      // tempost = post
      resultObj = post
      resultObj.map(singlePost => {
        var tempost = singlePost
        var alreadyLiked = false
        tempost.likes.map(singleLike => {
          if (`${singleLike.likedBy}` == req.params.userId) {
            alreadyLiked = true
          } else {
            alreadyLiked = false
          }
        })
        tempost['alreadyLiked'] = alreadyLiked
        console.log(tempost)
      })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        message: 'failed to fetch post',
        error: err
      })
    })
}

exports.like_post = (req, res, next) => {
  let findMyPost = () => {
    return new Promise((resolve, reject) => {
      Post.findOne({ _id: req.params.postId })
        .lean()
        .exec((err, obtainedPost) => {
          if (err) {
          } else {
            let alreadyLiked = false
            console.log('obtained.....', obtainedPost.likes)
            obtainedPost.likes.map(singleLike => {
              if (`${singleLike.likedBy}` == req.body.userId) {
                alreadyLiked = true
              } else {
              }
            }) //end map

            if (alreadyLiked == true) {
              resolve(alreadyLiked)
            } else {
              reject(alreadyLiked)
            }
          }
        }) //end post find
    }) //end promise
  }

  let updateLikes = successMessage => {
    if (successMessage == true) {
      return new Promise((resolve, reject) => {
        Post.findByIdAndUpdate(req.params.postId, {
          $pull: { likes: { likedBy: req.body.userId } }
        })
          .exec()
          .then(post => {
            console.log('PULL', post.likes)
            resolve(post)
          })
          .catch(err => {
            console.log('something terrible had happened..... I guess')
            console.log(err)
          })
      })
    }
  }

  findMyPost()
    .then(updateLikes)
    .then(result => {
      console.log('UNLIKE', result['likes'])
      res.status(200).json({
        message: 'unliked successfully',
        likecount: result['likes'].length - 1
      })
    })
    .catch(err => {
      const like = {
        likedBy: req.body.userId,
        likedAt: Date.now()
      }

      Post.findByIdAndUpdate(
        req.params.postId,
        { $push: { likes: like } },
        { new: true }
      )
        .exec()
        .then(post => {
          console.log('LIKE', post['likes'])

          res.status(200).json({
            message: 'liked successfully',
            likecount: post['likes'].length
          })
        })
        .catch(err => {
          console.log(err)
          reject('already liked or error')
        })
    })
}

exports.comment_post = (req, res, next) => {
  const comment = new Comment({
    _id: new mongoose.Types.ObjectId(),
    postId: req.params.postId,
    body: req.body.body,
    createdAt: Date.now(),
    createdBy: {
      userId: req.body.userId,
      name: req.body.name
    }
  })

  comment
    .save()
    .then(comment => {
      console.log(comment)
      Post.findByIdAndUpdate(
        comment.postId,
        { $push: { comments: comment._id } },
        { new: true }
      )
        .exec()
        .then(post => {
          console.log(post)
          res.status(201).json({
            message: 'commented successfully',
            comment: {
              _id: comment._id,
              postId: comment.postId,
              createdAt: comment.createdAt,
              createdBy: comment.createdBy
            }
          })
        })
        .catch(err => {
          console.log(err)
          Comment.findByIdAndDelete(comment._id)
            .exec()
            .then(deletedComment => {
              console.log(deletedComment)
              res.status(500).json({
                message: 'failed comment deleted'
              })
            })
            .catch(err => {
              console.log(err)
              res.status(500).json({
                message: 'failed to comment',
                error: err
              })
            })
        })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        message: 'failed to comment on post',
        error: err
      })
    })
}
//TODO Fix Later as the comment id is not getting added to replies[]
exports.reply_to_comment = (req, res, next) => {
  const comment = new Comment({
    _id: new mongoose.Types.ObjectId(),
    body: req.body.body,
    createdAt: Date.now(),
    createdBy: {
      userId: req.body.userId,
      name: req.body.name
    }
  })

  comment
    .save()
    .then(comment => {
      Comment.findByIdAndUpdate(
        req.params.commentId,
        { $push: { replies: comment._id } },
        { new: true }
      )
        .then(repliedTo => {
          console.log(repliedTo)
          res.status(201).json({
            message: 'comment added',
            repliedTo: {
              _id: repliedTo._id,
              body: repliedTo.body,
              createdAt: repliedTo.createdAt,
              createdBy: repliedTo.createdBy,
              likes: repliedTo.likes,
              replies: repliedTo.replies
            }
          })
        })
        .catch(err => {
          console.log(err)
          Comment.findByIdAndDelete(comment._id)
            .exec()
            .then(deletedComment => {
              console.log(deletedComment)
              res.status(500).json({
                message: 'failed reply deleted'
              })
            })
            .catch(err => {
              console.log(err)
              res.status(500).json({
                message: 'failed to reply',
                error: err
              })
            })
        })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        message: 'failed to reply',
        error: err
      })
    })
}

exports.like_comment = (req, res, next) => {
  Comment.findOne({ _id: req.params.commentId })
    .lean()
    .exec()
    .then((obtainedComment, err) => {
      if (err) {
        console.log(err)
      } else {
        let alreadyLiked = false
        obtainedComment.likes.map(singleLike => {
          if (`${singleLike.likedBy}` == req.body.userId) {
            alreadyLiked = true
          } else {
          }
        }) //end map
        return alreadyLiked
      }
    })
    .then(result => {
      if (result == true) {
        Comment.findByIdAndUpdate(req.params.commentId, {
          $pull: { likes: { likedBy: req.body.userId } }
        })
          .exec()
          .then(comment => {
            console.log('here ' + comment)
            res.status(201).json({
              message: 'Unliked successfully',
              likecount: comment['likes'].length - 1
            })
          })
          .catch(err => {
            console.log('something terrible had happened..... I guess')
            console.log(err)
          })
      } else {
        const like = {
          likedBy: req.body.userId,
          likedAt: Date.now()
        }
        Comment.findByIdAndUpdate(
          req.params.commentId,
          { $push: { likes: like } },
          { new: true }
        )
          .exec()
          .then(comment => {
            console.log(comment)
            res.status(201).json({
              message: 'comment liked successfully',
              likecount: comment['likes'].length
            })
          })
          .catch(err => {
            console.log(err)
            res.status(500).json({
              message: 'failed to like comment',
              error: err
            })
          })
      }
    })
}

exports.getComments = (req, res, next) => {
  Comment.find({ $and: [{ postId: req.params.postId }] })
    .lean()
    .exec()
    .then((result, err) => {
      if (err) {
        res.send(err)
        return err
      } else {
        return result
      }
    })
    .then(result => {
      let tempResult = result
      Promise.all(
        tempResult.map(async comment => {
          var comm = comment
          await User.findOne(
            { _id: comment.createdBy.userId },
            (err2, res2) => {
              if (err2) {
                console.log('err2 is ' + err2)
                res.status(500).json({
                  message: 'failed reply deleted',
                  error: err2
                })
              } else {
                if (res2 == null) {
                  comm['profile_pic'] =
                    'https://lh3.googleusercontent.com/a-/AAuE7mBZOJf8xINXnRo1jQYYlIpMdS5CNVlermJMrlazpw=s96-c'
                  comm['username'] = 'User Deleted'
                } else {
                  comm['profile_pic'] = res2.profile_pic
                  comm['username'] = res2.username
                }
              }
            }
          )
        })
      ).then(() => {
        res.status(200).json(result)
      })
    })
}

exports.getPostByUser = (req, res, next) => {
  Post.find({
    $and: [{ 'createdBy.userId': req.params.userId, media: { $ne: null } }]
  })
    .lean()
    .exec((err, result) => {
      if (err) {
        res.send(err)
      } else {
        res.send(result)
      }
    })
}

exports.savePost = (req, res, next) => {
  const saved = {
    savedBy: req.params.userId,
    savedAt: Date.now()
  }
  Post.findByIdAndUpdate(
    req.params.postId,
    { $push: { saved: saved } },
    { new: true }
  )
    .exec()
    .then(post => {
      console.log(post)
      res.status(200).json({
        message: 'post saved succesfully'
      })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        message: 'failed',
        error: err
      })
    })
}

exports.reportPost = (req, res, next) => {
  const reported = {
    reportedBy: req.params.userId,
    reportedAt: Date.now(),
    reportedFor: req.body.for
  }

  Post.findByIdAndUpdate(
    req.params.postId,
    { $push: { reports: reported } },
    { new: true }
  )
    .exec()
    .then(post => {
      console.log(post)
      res.status(200).json({
        message: 'reported'
      })
    })
    .catch(err => {
      res.status(500).json({
        message: 'failed',
        error: err
      })
    })
}

exports.getSavedPost = (req, res, next) => {
  Post.find({ $and: [{ 'saved.savedBy': req.params.userId }] })
    .lean()
    .exec((err, result) => {
      if (err) {
        res.send(err)
      } else {
        res.send(result)
      }
    })
}

exports.getAudios = (req, res, next) => {
  Post.find({ type: 'audio', category: req.body.category })
    .lean()
    .exec()
    .then(result => {
      let resultObj = result
      let finalResult = []

      Promise.all(
        resultObj.map(async singlePost => {
          var tempost = JSON.parse(JSON.stringify(singlePost))
          await User.findOne(
            { _id: singlePost.createdBy.userId },
            (err2, res2) => {
              if (err2) {
                console.log('err2 is ' + err2)
                res.status(500).json({
                  message: 'failed reply deleted',
                  error: err2
                })
              } else {
                if (res2 == null) {
                  tempost['profile_pic'] =
                    'https://lh3.googleusercontent.com/a-/AAuE7mBZOJf8xINXnRo1jQYYlIpMdS5CNVlermJMrlazpw=s96-c'
                  tempost['username'] = 'User Deleted'
                } else {
                  tempost['profile_pic'] = res2.profile_pic
                  tempost['username'] = res2.username
                }
              }
            }
          )
          finalResult.push(tempost)
        })
      )
        .then(() => {
          res.status(200).json(finalResult)
        })
        .catch(err => {
          res.status(500).json({
            message: 'failed to fetch audios',
            error: err
          })
        })
    })
}

exports.get_post_byid = (req, res, next) => {
  Post.find({ _id: req.params.postId })
    .lean()
    .exec()
    .then(result => {
      var tempost = result[0]
      var alreadyLiked = false
      tempost.likes.map(singleLike => {
        if (`${singleLike.likedBy}` == req.params.userId) {
          alreadyLiked = true
        } else {
          alreadyLiked = false
        }
      })
      tempost['alreadyLiked'] = alreadyLiked
      return result[0]
    })
    .then(result => {
      var tempost = result
      User.findOne({ _id: result.createdBy.userId }, (err2, res2) => {
        if (err2) {
          console.log('err2 is ' + err2)
          res.status(500).json({
            message: 'failed reply deleted',
            error: err2
          })
        } else {
          if (res2 == null) {
            tempost['profile_pic'] =
              'https://lh3.googleusercontent.com/a-/AAuE7mBZOJf8xINXnRo1jQYYlIpMdS5CNVlermJMrlazpw=s96-c'
            tempost['username'] = 'User Deleted'
          } else {
            tempost['profile_pic'] = res2.profile_pic
            tempost['username'] = res2.username
            res.status(200).json({
              post: result
            })
          }
        }
      })
    })
}

exports.reportedPosts = (req, res, next) => {
  Post.find({ reports: { $exists: true, $not: { $size: 0 } } })
    .exec()
    .then(posts => {
      // console.log(posts)
      res.status(201).json({
        data: posts
      })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({})
    })
}
