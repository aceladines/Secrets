require('dotenv').config()
const {Secret, User} = require('./db');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const morgan = require('morgan');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const favicon = require('serve-favicon');

const GoogleStrategy = require('passport-google-oauth20').Strategy;


const app = express();

const port = process.env.PORT
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static('public'))
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(morgan('dev'))
app.use(helmet())

app.set('view engine', 'ejs')

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({
    url: process.env.URI,
    touchAfter: 24 * 3600, // time period in seconds
    secret: process.env.SECRET_MC
})
}))

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy())

passport.serializeUser(function(user, done) {
  done(null, user.id);
});
 
passport.deserializeUser(function(id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "https://hiddensecrets.herokuapp.com/auth/google/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get('/', (req, res)=>{
  if(req.isAuthenticated()){res.redirect('/secrets')}
  else{res.render('home')}
})


app.get('/login',(req, res)=>{
    if(req.isAuthenticated()){res.redirect('/secrets')}
    else{res.render('login')}
  })

app.post('/login', passport.authenticate('local', { successRedirect:'/secrets',failureRedirect: '/login' }));

app.route('/register')
  .get((req, res)=>{
    if(req.isAuthenticated()){res.redirect('/secrets')}
    else{res.render('register')}
  })
  .post((req, res)=>{
    User.register({username:req.body.username}, req.body.password, function(err, user) {
      if (err) {console.log(err);
      res.redirect('/register')}
     
      passport.authenticate("local")(req, res, function (){
        res.redirect('/secrets')
      })
    });
  })

app.get('/secrets', (req, res)=>{
  if(req.isAuthenticated()){
    Secret.find((err, result)=>{
      res.render('secrets', {secret: result.reverse()})})
    }
  else{res.redirect('/login')}
})

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.route('/submit')
  .get((req, res)=>{
    if(req.isAuthenticated()){res.render('submit')}
    else{res.redirect('/login')}
  })
  .post((req, res)=>{
    const newSecret = new Secret({
      secret: req.body.secret
    })
   newSecret.save(err =>{
     if(err){console.log(err);}
     else{res.redirect('/secrets')}
   })
  })

  app.use(function(req,res){
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    res.status(404).render('404', {url: fullUrl});
  });

app.listen(port)