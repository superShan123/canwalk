const userDB = require("../../models/user/user");
const sendOtpEmail = require("../../utils/sendOtpEmail");

// Function to generate a 6-digit OTP
const generateOtp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
    console.log("Generated OTP:", otp); // Debugging
    return otp;
};

// Function to render the OTP page
const renderOtpPage = (req, res, { success = null, error = null } = {}) => {
    const email = req.session?.tempUser?.email;
    res.render("home/otp", { email, success, error });
};

// Function to verify OTP
const verifyOtp = async (req, res) => {
    const { otp } = req.body; // Get OTP from request body
    const tempUser = req.session?.tempUser; // Get the tempUser from session

    // Check if tempUser and sessionOtp exist
    if (!tempUser || !tempUser.otp) {
        return res.status(400).send("No OTP found in session. Please retry signup.");
    }

    const sessionOtp = tempUser.otp; // Get OTP from tempUser in session

    // Compare the OTP as strings to ensure proper match
    if (otp === String(sessionOtp)) {
        const { username, email, password } = tempUser;

        // Check if all necessary fields are present
        if (!username || !email || !password) {
            return res.status(400).send("Incomplete user data. Please retry signup.");
        }

        const newUser = new userDB({ username, email, password });

        try {
            await newUser.save(); // Save user to database
            console.log("User saved successfully.");

            // Clear the session after saving the user
            req.session.tempUser = null;

            // Redirect to login page after successful signup
            return res.redirect("/login");
        } catch (error) {
            console.error("Error saving user to database:", error);

            if (error.name === 'ValidationError') {
                return renderOtpPage(req, res, { error: "Validation error: " + error.message });
            }

            return renderOtpPage(req, res, { error: "Failed to save user." });
        }
    } else {
        // OTP is incorrect
        return renderOtpPage(req, res, { error: "Invalid OTP." });
    }
};

// Function to resend OTP
const resendOtp = (req, res) => {
    const email = req.session?.tempUser?.email;

    if (!email) {
        return res.redirect("/signup");
    }

    const newOtp = generateOtp();
    req.session.tempUser.otp = newOtp;

    try {
        sendOtpEmail(email, newOtp);
        console.log(`New OTP sent to ${email}`);

        return res.redirect('/otp');
    } catch (error) {
        console.error("Error while sending OTP email:", error);
        return renderOtpPage(req, res, { error: "Failed to resend OTP. Please try again later." });
    }
};

// Export each function
module.exports = {
    generateOtp,
    renderOtpPage,
    verifyOtp,
    resendOtp
};
