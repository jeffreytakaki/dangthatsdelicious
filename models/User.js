const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise
const md5 = require('md5')
const validator = require('validator')
const mongodbErrorHandler = require('mongoose-mongodb-errors')
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
	email: {
		type: String,
		unique: true,
		lowercase: true,
		trim: true,
		validate: [validator.isEmail, "Invalid Email Address"],
		required: 'Please submit an email address'
	},
	name: {
		type: String,
		trim: true, 
		required: "Please supply us a name"
	},
	resetTokenPassword: String,
	resetTokenExpires: Date,
	hearts: [
		{ type: mongoose.Schema.ObjectId,ref: 'Store'}
	]

})

userSchema.plugin(passportLocalMongoose,{usernameField: 'email'})
userSchema.plugin(mongodbErrorHandler)

userSchema.virtual('gravatar').get(function() {
	//md5 hashes email addres so it's not in image src
	const hash =md5(this.email)
	return `https://gravatar.com/avatar/${hash}?s200`;
})



module.exports = mongoose.model('User', userSchema)