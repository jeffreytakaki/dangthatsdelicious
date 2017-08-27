const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify')

exports.loginForm = (req, res) => {
	res.render('login', {title: 'Log in'})
}

exports.registerForm = (req, res) => {
	res.render('register', {title: "Register"})
}

exports.validateRegister = (req, res, next) => {
	// all these extra methods are provided by validator plugin from User.js
  req.sanitizeBody('name');
  req.checkBody('name', 'You must supply a name!').notEmpty();
  req.checkBody('email', 'That Email is not valid!').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    gmail_remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody('password', 'Password Cannot be Blank!').notEmpty();
  req.checkBody('password-confirm', 'Confirmed Password cannot be blank!').notEmpty();
  req.checkBody('password-confirm', 'Oops! Your passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();
  if (errors) {
    req.flash('error', errors.map(err => err.msg));
    res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
    return; // stop the fn from running
  }
  next(); // there were no errors!
};

exports.register = async (req, res, next) => {
  const user = new User({email: req.body.email, name: req.body.name})
  // register comes from passportlocalmongoose
  // accepts user model and password
  // the problem is that it doesn't offer a promise, just a call back so your sequence will be all messed up. to mitify this, we will use the promisify library.
  // User.register(user, req.body.password, function(err, user){

  // })

 const register = promisify(User.register, User)

 await register(user, req.body.password) //will save password as a hash
 next() // pass to auth controller

}


exports.account = (req, res, next) => {
  res.render('account', {title: 'Account'})
}

exports.updateAccount = async (req, res) => {
  const updates = {
    name: req.body.name,
    email: req.body.email,
  }

  // const user = await User.findOneAndUpdate(query, update, options)
  const user = await User.findOneAndUpdate(
    {_id: req.user._id},
    {$set: updates},
    { new: true, runValidators: true, context: 'query'}
    )

  // res.json(user)
  res.redirect('back')
  // res.redirect('/')
}





















