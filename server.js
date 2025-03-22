require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve frontend từ "Herbal Website"
app.use(express.static('Herbal Website'));

// Bộ nhớ tạm (giả database)
const users = {};

// Cấu hình gửi email xác nhận qua Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,  // Gmail của bạn
        pass: process.env.EMAIL_PASS   // Mật khẩu ứng dụng
    },
});

//  **API xử lý đăng ký**
app.post('/register', async (req, res) => {
    const { fullName, email, cccd, password, dob, phone } = req.body;

    if (!fullName || !email || !cccd  || !password || !dob || !phone ) {
        return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Mã hóa mật khẩu trước khi lưu
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    // Lưu thông tin người dùng (giả lập database)
    users[email] = { 
        fullName, 
        email, 
        cccd, 
        password: hashedPassword, // Lưu mật khẩu đã mã hóa
        verified: false, 
        verificationToken, 
        dob, 
        phone 
    };

    // Tạo link xác minh email
    const verificationLink = `http://localhost:3000/verify?token=${verificationToken}&email=${email}`;

    // Gửi email xác nhận
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Xác nhận đăng ký tài khoản',
        html: `<p>Chào ${fullName},</p>
               <p>Nhấp vào liên kết dưới đây để xác minh tài khoản của bạn:</p>
               <a href="${verificationLink}">${verificationLink}</a>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ message: 'Không thể gửi email xác nhận' });
        }
        res.json({ message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác minh' });
    });
});

//  **API xử lý xác minh email**
app.get('/verify', (req, res) => {
    const { token, email } = req.query;

    if (users[email] && users[email].verificationToken === token) {
        users[email].verified = true;
        return res.redirect('/login-register.html'); // Chuyển về trang đăng nhập
    }
    
    res.status(400).send('Xác minh thất bại hoặc mã không hợp lệ.');
});

//  **API xử lý đăng nhập**
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!users[email]) {
        return res.status(400).json({ message: 'Email chưa đăng ký!' });
    }

    if (!users[email].verified) {
        return res.status(400).json({ message: 'Tài khoản chưa xác minh email!' });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, users[email].password);
    if (!isMatch) {
        return res.status(400).json({ message: 'Mật khẩu không đúng!' });
    }

    res.json({ message: 'Đăng nhập thành công!' });
});

// Chạy server
app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});
