const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose')
const User = mongoose.model('User');
const promisify = require('es6-promisify')
const mail = require("../handlers/mail")

exports.login = passport.authenticate('local', {
	failureRedirect: '/login',
	failureFlash: 'Failed Login!',
	successRedirect: '/',
	successFlash:'You are now logged in'
})


exports.logout = (req, res) => {
	req.logout();
	req.flash('success', 'You are now logged out');
	res.redirect('/')
}

exports.isLoggedIn = (req, res, next) => {
	//first check if user is authenticated 
	if(req.isAuthenticated()) {
		next();
		return;
	} 

	req.flash("error", 'you are not logged in')
	res.redirect('/')
}

exports.forgot = async (req, res) => {
	//see if user exists
	const user = await User.findOne({email: req.body.email});

	if(!user) {
		req.flash('error', 'no email in system')
		return res.redirect('/login')
	}

	// reset tokens expiry in account
	user.resetTokenPassword = crypto.randomBytes(20).toString('hex')
	user.resetTokenExpires = Date.now() + 3600000; //one hour from now
	await user.save()

	// send them an email with the token
	const resetUrl = `http://${req.headers.host}/account/reset/${user.resetTokenPassword}`;
	req.flash('success', `You have been mailed a password reset link.`)

	await mail.send({
		user,
		subject: 'Password Reset',
		resetUrl,
		filename: 'password-reset'
	})


	res.redirect('/login')



	// redirect to login page

}

exports.reset = async (req, res) => {
	const user = await User.findOne({
		resetTokenPassword: req. params.token,
		resetTokenExpires: {$gt: Date.now()}
	})

	if(!user) {
		res.flash('error', 'Password reset is invalid or has expired')
		return res.redirect('/login')
	}

	res.render('reset', {title: 'Reset your Password'})
}


exports.confirmedPasswords = (req, res, next) => {
	if(req.body.password == req.body['password-confirm']) {
		next(); //keep it going
		return;
	}

	req.flash('error', 'Passwords do not match!')
	res.redirect('/login')

}

exports.update = async (req, res) => {
	const user = await User.findOne({
		resetTokenPassword: req. params.token,
		resetTokenExpires: {$gt: Date.now()}
	})

	if(!user) {
		res.flash('error', 'Password reset is invalid or has expired')
		return res.redirect('/login')
	}

	//set password available through User.js. but not promise...
	//user.setPassword()

	const setPassword = promisify(user.setPassword, user)
	await setPassword(req.body.password);

	user.resetTokenPassword = undefined;
	user.resetTokenExpires = undefined;
	const updatedUser = await user.save();

	//login available through passport middleware
	await req.login(updatedUser)

	req.flash('Success', " Nice! Your password has been reset!")
	res.redirect('/')

}
















































