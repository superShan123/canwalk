const dotenv = require('dotenv');
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const otpController = require("./otpController");
const sendOtp = require('../../utils/sendOtpEmail');
const userDB = require("../../models/user/user");
const Product = require('../../models/admin/product');
const Category = require('../../models/admin/category');
const {body,validationResult} = require('express-validator')




dotenv.config();

const getHome = async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.render('home/index')
        }

        const user = await userDB.findById(req.session.userId);
        

        if (!user) {
            req.session.destroy((err) => {
                if (err) console.error('Session destruction error:', err);
                return res.redirect('/login');
            })
            return;
        }

        if (user.isBlocked) {
            req.session.destroy((err) => {
                if (err) console.error('Session destruction error:', err);
                return res.render('blocked', { error: 'Your account is blocked' });
            });
            return;
        }

        res.render("home/index");
        
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send("An error occurred");
    }
};


const getSignup = (req, res) => {
    let errors = []
    res.render("home/signup",{errors});
};


const postSignup = async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        const errors = [];

        // Validation checks
        if (!username || !email || !password || !confirmPassword) {
            errors.push("All fields are required.");
        }
        if (password !== confirmPassword) {
            errors.push("Passwords do not match.");
        }
        if (password.length < 6) {
            errors.push("Password must be at least 6 characters long.");
        }

        // Check if email already exists
        const existingEmail = await userDB.findOne({ email });
        if (existingEmail) {
            errors.push("Email is already registered.");
        }

        // If errors exist, return errors as JSON
        if (errors.length > 0) {
            return res.status(400).json({ success: false, error: errors.join(" ") });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Generate OTP
        const otp = otpController.generateOtp();

        // Store temporary user data in session
        req.session.tempUser = {
            username,
            email,
            password: hashedPassword,
            otp,
        };

        // Send OTP email
        await sendOtp.sendOtpEmail(email, otp);

        // Redirect to OTP page
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("Error during signup process:", err);
        return res.status(500).json({ success: false, error: "An error occurred, please try again." });
    }
};         

const getLogin = (req, res) => {
    res.render('home/login');
};

const postLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await userDB.findOne({ username });

        if (!user) {
            return res.redirect('/signup?message=Please sign up first');
        }

        if (user.status == "inactive") {
            req.session.destroy((err) => {
                if (err) console.error('Session destruction error:', err);
                return res.render('home/login', { error: 'Your account is blocked' });
            });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.render('home/login', { error: 'Incorrect password' });
        }

    // Save user data in session
    req.session.userId = user._id;
    console.log('Session:', req.session);

 

    res.redirect('/')

    } catch (error) {
        console.error("Error during login:", error);
        res.render('/login', { error: 'An error occurred during login. Please try again.' });
    }
};



const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const sessionOtp = req.session.temp.user;

        if (otp === sessionOtp) {
            const newUser = await userDB({ username, email, password });
            newUser.save();
           res.redirect('/login')
           
        } else {
            res.render("home/otp", { error: "Invalid OTP" });
        }
    } catch (error) {
        console.error("Error during OTP verification:", error);
        res.render("home/otp", { error: "An error occurred while verifying the OTP." });
    }
};

const getUserProducts = async (req, res) => {
    try {
    
        // Fetch active categories
        const activeCategories = await Category.find({ status: 'active' });

        if (!activeCategories || activeCategories.length === 0) {
         
            return res.render('home/productlist', { products: [], currentPage: 1, totalPages: 1 });
        }

        // Pagination logic start
        let currentPage = parseInt(req.query.page) || 1;

        const pageSize = 7; 
        const skip = (currentPage - 1) * pageSize 
    
        const products = await Product.find({ status: 'active' })
            .skip(skip)
            .limit(pageSize)
            .populate('category', 'name status');

        const totalProducts = await Product.countDocuments({ status: 'active' });
        const totalPages = Math.ceil(totalProducts / pageSize);

        const productwithDiscount = products.map(product=>{
            const discount = product.discount ||0;
            const discountPrice = product.price-(product.price*discount )/100;
           
            return{
                ...product._doc,
                discountPrice: discountPrice.toFixed(2),
                orginalPrice:product.price.toFixed(2),
                discountPercentage: discount>0?`-${discount}%`: null,
            }
        })

        
        

        
        res.render('home/productlist', {
            products:productwithDiscount, 
            currentPage, // Pass current page number
            totalPages,
            
        });
    } catch (err) {
        console.error('Error fetching products for user:', err);
        res.status(500).render('error', { message: 'Error fetching products' });
    }
};


const getProductDetails = async (req, res) => {
    const productId = req.params.id;
    try {
        // Fetch all active categories
        const activeCategories = await Category.find({ status: 'active' });

        if (!activeCategories || activeCategories.length === 0) {
           
            return res.render('home/productlist', { products: [] });
        }

        // Extract the IDs of active categories
        const activeCategoryIds = activeCategories.map(category => category._id);

        const product = await Product.findById(productId)
        .select('name quantity price description color size status category productImages discount stock images highlights')
        .populate('category', 'name');
        
       
        if (!product) {
            return res.status(404).send('Product not found');
        }
   
        const price = product.price || 0;
        const discount = product.discount || 0;
        const discountedPrice = discount > 0 ? price * (1 - discount / 100) : price;
      
        const productImages = product.images || []; 
        res.render('home/productdetails', { product, discountedPrice });
    } catch (error) { 

 
        console.error('Error fetching products for user:', error);
        res.status(500).render('error', { message: 'Error fetching products' });
    }
};

const postProductDetails = async (req, res) => {
    try {
        
        const newProduct = new Product({
            name: req.body.name,
            quantity: req.body.quantity,
            description: req.body.description,
            color: req.body.color,
            size: req.body.size,
            price: req.body.price,
            discount: req.body.discount || 0,
            images: Array.isArray(req.body.images) ? req.body.images : [req.body.images],
            category: Array.isArray(req.body.category) ? req.body.category : [req.body.category],
            status: req.body.status,
            productImages: Array.isArray(req.body.productImages) ? req.body.productImages : [req.body.productImages],
            highlights: req.body.highlights || [],
            createdAt: req.body.createdAt || new Date(),
        });

        await newProduct.save();

        res.status(201).json({ message: 'Product added successfully', product: newProduct });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error adding product' });
    }
};

const getUserCategories = async (req,res)=>{
    const categoryId = req.params.id

    try{
         res.redirect('/product')
    }catch(err){
         res.status(500).send('Internal server error')
    }

}


const productQuantity = async (req,res)=>{
    try{
        const product = await Product.findById(req.params.id).select('quantity');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
          }
          res.json(product);
    }catch(err){
        console.error('Error fetching product stock:', error);
    res.status(500).json({ message: 'Server error' }); 
    }
}


const getforgotPassword = async (req,res)=>{
    res.render('home/forgot-password')
}


const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await userDB.findOne({ email });
        if (!user) {
            return res.status(400).send('User not found!');
        }

        const otp = Math.floor(100000 + Math.random() * 900000);

        req.session.resetemail = email;
        req.session.otp = otp;

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            to: email,
            subject: 'Password Reset',
            text: `Your OTP for password reset is: ${otp}`,
        };

        console.log('Mail Options:', mailOptions);

        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
        res.redirect('/otp-verify')
    } catch (err) {
        console.error('Error occurred:', err);
        res.status(500).send('An error occurred');
    }
};



const resetPassword = async (req,res)=>{

const {newPassword, confirmPassword} = req.body;

try{
    const email = req.session.resetemail
    const user = await userDB.findOne({email})

    if(!user){
        return res.status(400).send('User not found')
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save()

    res.redirect('/login')
}catch(err){
    res.status(500).send('Error occured while reseting')
}}


const getresetPassword = async (req,res)=>{
    res.render('home/reset-password')
}




const otpVerify = async (req,res)=>{
    const {otp} = req.body;

    try{
        if(otp === req.session.otp.toString()){
            req.session.isVerified = true;
            res.redirect('/reset-password')
        }else{
            res.status(400).send('Not matching the otp')
        }
    }catch(err){
        console.error('Error fetching',err)
        res.status(500).send('Internal server error')

    }
}


const getOtpVerify = async (req,res)=>{
    res.render('home/verify-otp')
}


// Exporting the controller functions
module.exports = {
    getHome,
    getSignup,
    getLogin,
    postSignup,
    postLogin,
    verifyOtp,
    getUserProducts,
    getProductDetails,
    postProductDetails,
    getUserCategories,
    productQuantity,
    forgotPassword,
    resetPassword,
    getforgotPassword,
    getresetPassword,
    otpVerify,
    getOtpVerify
    
};



