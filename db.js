require('dotenv').config()
const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose')
const uniqueValidator = require('mongoose-unique-validator');
const findOrCreate = require('mongoose-findorcreate')

const Schema = mongoose.Schema
const URI = process.env.URI
mongoose.connect(URI, {useNewUrlParser: true, useUnifiedTopology: true})
mongoose.set('useCreateIndex', true);

const secretSchema =  new Schema({
  secret: String
})

const userSchema = new Schema({
  username: {type: String,
            unique: true},
  password: String,
  googleId: String
})

userSchema.plugin(findOrCreate);
userSchema.plugin(uniqueValidator)
userSchema.plugin(passportLocalMongoose)

const Secret = mongoose.model('Secret', secretSchema);
const User = mongoose.model('User', userSchema);

module.exports = {
  Secret,
  User
}