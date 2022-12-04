const Photo = require('../models/photo.model');
const Voter = require('../models/Voter.model')
const path = require("path");
const sanitize = require('mongo-sanitize')
/****** SUBMIT PHOTO ********/

const patternWithoutHTML = new RegExp(/(<\s*(strong|em)*>(([A-z]|\s)*)<\s*\/\s*(strong|em)>)|(([A-z]|\s|\.)*)/, 'g');
const patternEmail = new RegExp(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)

const stringValidator = (string, pattern) => {
  const textMatched = string.match(pattern).join('');
  if(textMatched.length < string.length) throw new Error('Invalid characters...');
}

exports.add = async (req, res) => {
  try {
    sanitize(req.fields);
    const { title, author, email } = req.fields;
    stringValidator(title, patternWithoutHTML);
    stringValidator(author, patternWithoutHTML);
    stringValidator(email, patternEmail);
    const file = req.files.file;
    const properExtension = ['.jpg', '.gif', '.png'].includes(path.extname(file.path));
    const properTitle = title.length <= 25;
    if(properTitle && author && email && properExtension) { // if fields are not empty...

      const fileName = path.basename(file.path); // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const newPhoto = new Photo({ title, author, email, src: fileName, votes: 0 });
      await newPhoto.save(); // ...save new photo in DB
      res.json(newPhoto);

    } else {
      throw new Error('Wrong input!');
    }

  } catch(err) {
    console.log(err);
    res.status(500).json({ err: err.message });
  }

};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  console.log(req.socket.remoteAddress);

  try {
    // Validate user
    const currentUser = await Voter.findOne({user: req.socket.remoteAddress})
    if (!currentUser) {
      const newUser = new Voter({user: req.socket.remoteAddress, votes: [req.params.id]});
      await newUser.save();
    } else {
      if (currentUser.votes.includes(req.params.id)) {
        throw new Error('User already voted!');
      } else {
        await currentUser.updateOne({votes: [...currentUser.votes, req.params.id]})
      }
    }
    // Add like
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    if(!photoToUpdate) res.status(404).json({ message: 'Not found' });
    else {
      photoToUpdate.votes++;
      photoToUpdate.save();
      res.send({ message: 'OK' });
    }
  } catch(err) {
    res.status(500).json(err);
  }

};
