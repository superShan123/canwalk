const User = require("../../models/user/user");
const Category = require('../../models/admin/category');
const mongoose = require('mongoose');
const Order = require('../../models/user/order')
const Product = require('../../models/admin/product')
const Coupon = require('../../models/user/coupon')




// Admin Login Get Method

const getAdminLogin = (req, res) => {
    res.render('admin/login');
};


// Admin Login Post Method 

const postAdminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const adminUsername = 'admin';
        const adminPassword = 'admin123';

        if (username === adminUsername && password === adminPassword) {
            req.session.isAdmin = true;
           res.redirect('/admin/customers');

        } else {
            res.status(401).send('Incorrect username or password');
        }

    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).send("Error during login.");
    }
};


const getAdminDashboard = async (req, res) => {
    console.log("getAdminDashboard function called");

    try {
        const { year, week } = req.query;

        // Validate year and week format
        if (year && !/^\d{4}$/.test(year)) {
            return res.status(400).json({ error: "Invalid year format" });
        }
        if (week && !/^\d{1,2}$/.test(week)) {
            return res.status(400).json({ error: "Invalid week format" });
        }

        const matchCondition = {};

        if (year) {
            const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
            const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
            matchCondition.createdAt = { $gte: startOfYear, $lte: endOfYear };
        }

        if (week && year) {
            const jan1 = new Date(`${year}-01-01T00:00:00.000Z`);
            const dayOffset = (jan1.getDay() + 6) % 7; // Adjust for ISO week (Monday = 0)
            const startOfWeek = new Date(jan1);
            startOfWeek.setDate(jan1.getDate() + (week - 1) * 7 - dayOffset);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);


            console.log("ISO Start of Week:", startOfWeek.toISOString());
            console.log("ISO End of Week:", endOfWeek.toISOString());

            // Merge year and week conditions logically
            matchCondition.createdAt = {
                $gte: startOfWeek,
                $lte: endOfWeek,
            };
        }

        console.log("Match Condition:", matchCondition);

        // Yearly sales aggregation
        const yearlySales = await Order.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" } },
                    totalSales: { $sum: "$orderSummary.total" },
                },
            },
            { $sort: { "_id.month": 1 } },
        ]);

        console.log("Yearly Sales Aggregation Result:", yearlySales);

        // Fetching and processing additional stats...

        // Send response
        if (req.headers.accept && req.headers.accept.includes("application/json")) {
            console.log('inside the if condition for sending the application/json');
            return res.json({
                stats: {
                    totalCustomers: await User.countDocuments(),
                    totalOrders: await Order.countDocuments(),
                    totalRevenue: (
                        await Order.aggregate([{ $group: { _id: null, totalRevenue: { $sum: "$orderSummary.total" } } }])
                    )[0]?.totalRevenue || 0,
                },
                yearlySales,
            });
        } else {
            res.render("admin/dashboard", {
                stats: {
                    totalCustomers: await User.countDocuments(),
                    totalOrders: await Order.countDocuments(),
                    totalRevenue: (
                        await Order.aggregate([{ $group: { _id: null, totalRevenue: { $sum: "$orderSummary.total" } } }])
                    )[0]?.totalRevenue || 0,
                },
                yearlySales,
            });
        }
    } catch (err) {
        console.error("Error in getAdminDashboard:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};


  

// Admin Logout
const adminLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error during logout')
        }
        res.redirect('/admin/login');
    });
};

// Get Admin Customers
const getAdminCustomer = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        const skip = (page-1)*limit;

        const customers = await User.find().skip(skip).limit(limit);

        const totalCustomers = await User.countDocuments()

        const totalPages = Math.ceil(totalCustomers/ limit)
       

        // Directly passing the customers array to the view
        res.render('admin/customers', 
            { customerDetails: customers,
                currentPage : page,
                totalPages : totalPages,
                totalCustomers: totalCustomers,
                limit
             });
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).send('Internal Server Error');
    }
};

// Toggle User Status (Block/Unblock)
const toggleUserStatus = async (req, res) => {
    
    const userId = req.params.userId;
    const { status } = req.body;


    console.log('Request received:', req.method, req.originalUrl);  // Log method and URL
    console.log('User ID:', req.params.userId);
    console.log('Request Body:', req.body);  

    // Log the status

    try {
        const user = await User.findById(userId);
        console.log(user)
        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        user.status = status;
        await user.save();
        res.redirect('/admin/customers');
    } catch (error) {
        console.error('Error during status toggle:', error);
        res.status(500).send('Internal server Error');
    }
};





module.exports = {
    getAdminLogin,
    postAdminLogin,
    getAdminDashboard,
    adminLogout,
    getAdminCustomer,
    toggleUserStatus
};
